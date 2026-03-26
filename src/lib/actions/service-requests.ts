"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createServiceRequestSchema,
  updateServiceRequestSchema,
  type CreateServiceRequestInput,
  type UpdateServiceRequestInput,
} from "@/lib/validations/service-request";
import type { ActionResult, ServiceRequest } from "@/types";

async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  const { data: profile } = await supabase
    .from("profiles")
    .select("warehouse_id, role, client_id")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("Profile not found");
  return { supabase, user, profile };
}

// ─── Create Service Request ───────────────────────────────────────────────────

export async function createServiceRequest(
  input: CreateServiceRequestInput
): Promise<ActionResult<ServiceRequest>> {
  try {
    const validated = createServiceRequestSchema.parse(input);
    const { supabase, user, profile } = await getAuthContext();

    // Clients can only submit for their own client_id
    if (profile.role === "client" && validated.client_id !== profile.client_id) {
      return { success: false, error: "Cannot submit requests for other clients" };
    }

    const { item_ids, ...requestData } = validated;

    const { data: sr, error: srError } = await supabase
      .from("service_requests")
      .insert({
        ...requestData,
        warehouse_id: profile.warehouse_id,
        requested_by: user.id,
        status: profile.role === "client" ? "submitted" : "accepted",
      })
      .select()
      .single();

    if (srError) return { success: false, error: srError.message };

    // Link items
    if (item_ids.length > 0) {
      const { error: linkError } = await supabase
        .from("service_request_items")
        .insert(item_ids.map((item_id) => ({ service_request_id: sr.id, item_id })));

      if (linkError) console.error("Failed to link items to SR:", linkError);
    }

    revalidatePath("/dashboard/admin/service-requests");
    revalidatePath("/dashboard/client/service-requests");
    return { success: true, data: sr as unknown as ServiceRequest };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create service request",
    };
  }
}

// ─── Update Service Request ───────────────────────────────────────────────────

export async function updateServiceRequest(
  input: UpdateServiceRequestInput
): Promise<ActionResult<ServiceRequest>> {
  try {
    const { id, ...rest } = updateServiceRequestSchema.parse(input);
    const { supabase, profile } = await getAuthContext();

    // Staff/admin can update any SR; clients can only cancel their drafts
    const { data: existing } = await supabase
      .from("service_requests")
      .select("client_id, status")
      .eq("id", id)
      .single();

    if (!existing) return { success: false, error: "Service request not found" };

    if (
      profile.role === "client" &&
      (existing.client_id !== profile.client_id || existing.status !== "draft")
    ) {
      return { success: false, error: "Insufficient permissions" };
    }

    // Auto-set completed_date
    const updatePayload: Record<string, unknown> = { ...rest };
    if (rest.status === "completed" && !updatePayload.completed_date) {
      updatePayload.completed_date = new Date().toISOString();
    }

    const { data: sr, error } = await supabase
      .from("service_requests")
      .update(updatePayload)
      .eq("id", id)
      .eq("warehouse_id", profile.warehouse_id)
      .select("*, client:clients(name)")
      .single();

    if (error) return { success: false, error: error.message };

    // Notify the client when admin updates the service request status
    if (rest.status && profile.role !== "client") {
      const statusMessages: Record<string, string> = {
        accepted: "Your service request has been accepted.",
        scheduled: "Your service request has been scheduled.",
        in_progress: "Your service request is now in progress.",
        completed: "Your service request has been completed.",
        cancelled: "Your service request has been cancelled.",
      };
      const msg = statusMessages[rest.status as string];
      if (msg) {
        const { data: clientProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("client_id", existing.client_id)
          .eq("role", "client")
          .maybeSingle();

        if (clientProfile) {
          await supabase.from("notifications").insert({
            warehouse_id: profile.warehouse_id,
            profile_id: clientProfile.id,
            title: `Service request ${rest.status}`,
            body: `${msg} Request: ${(sr as any).title}`,
            type: "service_update",
            reference_id: id,
          });
        }
      }
    }

    revalidatePath("/dashboard/admin/service-requests");
    revalidatePath(`/dashboard/admin/service-requests/${id}`);
    revalidatePath("/dashboard/client/service-requests");
    revalidatePath("/dashboard/notifications");
    return { success: true, data: sr as unknown as ServiceRequest };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update service request",
    };
  }
}

// ─── Client: Edit Service Request ─────────────────────────────────────────────

export async function clientEditServiceRequest(
  id: string,
  input: {
    title: string;
    description?: string;
    delivery_address?: string;
    requested_date?: string;
    notes?: string;
  }
): Promise<ActionResult<null>> {
  try {
    const { supabase, user, profile } = await getAuthContext();
    if (profile.role !== "client") return { success: false, error: "Clients only" };

    const { data: existing } = await supabase
      .from("service_requests")
      .select("id, title, status, client_id, warehouse_id")
      .eq("id", id)
      .eq("client_id", profile.client_id)
      .single();

    if (!existing) return { success: false, error: "Request not found" };
    if (!["submitted", "draft"].includes(existing.status)) {
      return { success: false, error: "Only submitted requests can be edited" };
    }

    const { error } = await supabase
      .from("service_requests")
      .update({
        title: input.title,
        description: input.description ?? null,
        delivery_address: input.delivery_address ?? null,
        requested_date: input.requested_date ?? null,
        notes: input.notes ?? null,
      })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    // Notify warehouse admins
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("warehouse_id", existing.warehouse_id)
      .in("role", ["admin", "staff"]);

    if (adminProfiles?.length) {
      await supabase.from("notifications").insert(
        adminProfiles.map((p) => ({
          warehouse_id: existing.warehouse_id,
          profile_id: p.id,
          title: "Client updated a service request",
          body: `"${input.title}" was updated by the client.`,
          type: "service_update",
          reference_id: id,
        }))
      );
    }

    revalidatePath(`/dashboard/client/service-requests/${id}`);
    revalidatePath("/dashboard/admin/service-requests");
    revalidatePath(`/dashboard/admin/service-requests/${id}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update" };
  }
}

// ─── Client: Cancel Service Request ───────────────────────────────────────────

export async function clientCancelServiceRequest(
  id: string
): Promise<ActionResult<null>> {
  try {
    const { supabase, profile } = await getAuthContext();
    if (profile.role !== "client") return { success: false, error: "Clients only" };

    const { data: existing } = await supabase
      .from("service_requests")
      .select("id, title, status, client_id, warehouse_id")
      .eq("id", id)
      .eq("client_id", profile.client_id)
      .single();

    if (!existing) return { success: false, error: "Request not found" };
    if (["completed", "cancelled"].includes(existing.status)) {
      return { success: false, error: "Request is already closed" };
    }
    if (existing.status === "in_progress") {
      return { success: false, error: "Cannot cancel a request that is in progress — contact the warehouse" };
    }

    const { error } = await supabase
      .from("service_requests")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    // Notify warehouse admins
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("warehouse_id", existing.warehouse_id)
      .in("role", ["admin", "staff"]);

    if (adminProfiles?.length) {
      await supabase.from("notifications").insert(
        adminProfiles.map((p) => ({
          warehouse_id: existing.warehouse_id,
          profile_id: p.id,
          title: "Client cancelled a service request",
          body: `"${existing.title}" was cancelled by the client.`,
          type: "service_update",
          reference_id: id,
        }))
      );
    }

    revalidatePath(`/dashboard/client/service-requests/${id}`);
    revalidatePath("/dashboard/client/service-requests");
    revalidatePath("/dashboard/admin/service-requests");
    revalidatePath(`/dashboard/admin/service-requests/${id}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to cancel" };
  }
}
