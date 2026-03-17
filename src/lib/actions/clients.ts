"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createClientSchema,
  updateClientSchema,
  type CreateClientInput,
  type UpdateClientInput,
} from "@/lib/validations/client";
import type { ActionResult, Client } from "@/types";

async function getAdminContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  const { data: profile } = await supabase
    .from("profiles")
    .select("warehouse_id, role")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("Profile not found");
  if (profile.role !== "admin") throw new Error("Admin access required");
  return { supabase, user, profile };
}

export async function createNewClient(
  input: CreateClientInput
): Promise<ActionResult<Client>> {
  try {
    const validated = createClientSchema.parse(input);
    const { supabase, profile } = await getAdminContext();

    const { data: client, error } = await supabase
      .from("clients")
      .insert({ ...validated, warehouse_id: profile.warehouse_id })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/admin/clients");
    return { success: true, data: client as unknown as Client };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create client",
    };
  }
}

export async function updateClientRecord(
  input: UpdateClientInput
): Promise<ActionResult<Client>> {
  try {
    const { id, ...rest } = updateClientSchema.parse(input);
    const { supabase, profile } = await getAdminContext();

    const { data: client, error } = await supabase
      .from("clients")
      .update(rest)
      .eq("id", id)
      .eq("warehouse_id", profile.warehouse_id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/admin/clients");
    revalidatePath(`/dashboard/admin/clients/${id}`);
    return { success: true, data: client as unknown as Client };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update client",
    };
  }
}

export async function deactivateClient(clientId: string): Promise<ActionResult<null>> {
  try {
    const { supabase, profile } = await getAdminContext();
    const { error } = await supabase
      .from("clients")
      .update({ is_active: false })
      .eq("id", clientId)
      .eq("warehouse_id", profile.warehouse_id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/admin/clients");
    return { success: true, data: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to deactivate client",
    };
  }
}
