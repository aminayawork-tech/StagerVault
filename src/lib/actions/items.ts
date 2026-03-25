"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createItemSchema,
  updateItemSchema,
  moveItemSchema,
  updateItemStatusSchema,
  type CreateItemInput,
  type UpdateItemInput,
  type MoveItemInput,
  type UpdateItemStatusInput,
} from "@/lib/validations/item";
import type { ActionResult, Item } from "@/types";

async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("warehouse_id, role, client_id")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");

  return { supabase, user, profile };
}

// ─── Create Item ──────────────────────────────────────────────────────────────

export async function createItem(
  input: CreateItemInput,
  photoFiles?: FormData
): Promise<ActionResult<Item>> {
  try {
    const validated = createItemSchema.parse(input);
    const { supabase, user, profile } = await getAuthContext();

    if (!["admin", "staff"].includes(profile.role)) {
      return { success: false, error: "Insufficient permissions" };
    }

    const { data: item, error } = await supabase
      .from("items")
      .insert({
        ...validated,
        warehouse_id: profile.warehouse_id,
        status: "received",
        received_at: new Date().toISOString(),
        created_by: user.id,
      })
      .select("*, client:clients(name), location:locations(label)")
      .single();

    if (error) {
      console.error("createItem error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/admin/items");
    revalidatePath("/dashboard/staff");
    return { success: true, data: item as unknown as Item };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create item",
    };
  }
}

// ─── Update Item ──────────────────────────────────────────────────────────────

export async function updateItem(
  input: UpdateItemInput
): Promise<ActionResult<Item>> {
  try {
    const { id, ...rest } = updateItemSchema.parse(input);
    const { supabase, user, profile } = await getAuthContext();

    if (!["admin", "staff"].includes(profile.role)) {
      return { success: false, error: "Insufficient permissions" };
    }

    const { data: item, error } = await supabase
      .from("items")
      .update({ ...rest, created_by: user.id }) // created_by used by event trigger
      .eq("id", id)
      .eq("warehouse_id", profile.warehouse_id)
      .select("*, client:clients(name), location:locations(label)")
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/admin/items");
    revalidatePath(`/dashboard/admin/items/${id}`);
    return { success: true, data: item as unknown as Item };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update item",
    };
  }
}

// ─── Move Item to New Location ────────────────────────────────────────────────

export async function moveItem(
  input: MoveItemInput
): Promise<ActionResult<{ item_id: string; location_id: string | null }>> {
  try {
    const validated = moveItemSchema.parse(input);
    const { supabase, user, profile } = await getAuthContext();

    if (!["admin", "staff"].includes(profile.role)) {
      return { success: false, error: "Insufficient permissions" };
    }

    const { error } = await supabase
      .from("items")
      .update({
        location_id: validated.to_location_id,
        created_by: user.id,
      })
      .eq("id", validated.item_id)
      .eq("warehouse_id", profile.warehouse_id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/admin/items");
    revalidatePath(`/dashboard/admin/items/${validated.item_id}`);
    return {
      success: true,
      data: { item_id: validated.item_id, location_id: validated.to_location_id },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to move item",
    };
  }
}

// ─── Update Item Status ───────────────────────────────────────────────────────

export async function updateItemStatus(
  input: UpdateItemStatusInput
): Promise<ActionResult<{ item_id: string; status: string }>> {
  try {
    const validated = updateItemStatusSchema.parse(input);
    const { supabase, user, profile } = await getAuthContext();

    if (!["admin", "staff"].includes(profile.role)) {
      return { success: false, error: "Insufficient permissions" };
    }

    const updatePayload: Record<string, unknown> = {
      status: validated.status,
      created_by: user.id,
    };
    if (validated.condition) updatePayload.condition = validated.condition;

    const { error } = await supabase
      .from("items")
      .update(updatePayload)
      .eq("id", validated.item_id)
      .eq("warehouse_id", profile.warehouse_id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/admin/items");
    revalidatePath(`/dashboard/admin/items/${validated.item_id}`);
    return {
      success: true,
      data: { item_id: validated.item_id, status: validated.status },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update status",
    };
  }
}

// ─── Upload Item Photos ───────────────────────────────────────────────────────

export async function uploadItemPhotos(
  itemId: string,
  formData: FormData
): Promise<ActionResult<{ urls: string[] }>> {
  try {
    const { supabase, user, profile } = await getAuthContext();

    if (!["admin", "staff"].includes(profile.role)) {
      return { success: false, error: "Insufficient permissions" };
    }

    const files = formData.getAll("photos") as File[];
    if (!files.length) return { success: false, error: "No files provided" };

    const uploadedUrls: string[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${profile.warehouse_id}/${itemId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("item-photos")
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        console.error("Photo upload error:", uploadError);
        continue;
      }

      // Record in item_photos table
      await supabase.from("item_photos").insert({
        item_id: itemId,
        warehouse_id: profile.warehouse_id,
        storage_path: path,
        uploaded_by: user.id,
      });

      uploadedUrls.push(path);
    }

    // Set primary photo if none exists
    if (uploadedUrls.length > 0) {
      const { data: item } = await supabase
        .from("items")
        .select("primary_photo_url")
        .eq("id", itemId)
        .single();

      if (!item?.primary_photo_url) {
        const { data: signedUrl } = await supabase.storage
          .from("item-photos")
          .createSignedUrl(uploadedUrls[0], 60 * 60 * 24 * 7); // 7-day signed URL

        if (signedUrl?.signedUrl) {
          await supabase
            .from("items")
            .update({ primary_photo_url: signedUrl.signedUrl })
            .eq("id", itemId);
        }
      }
    }

    revalidatePath(`/dashboard/admin/items/${itemId}`);
    return { success: true, data: { urls: uploadedUrls } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Photo upload failed",
    };
  }
}

// ─── Delete Item ──────────────────────────────────────────────────────────────

export async function deleteItem(itemId: string): Promise<ActionResult<null>> {
  try {
    const { supabase, profile } = await getAuthContext();

    if (profile.role !== "admin") {
      return { success: false, error: "Only admins can delete items" };
    }

    // Soft delete via status change (preferred – preserves history)
    const { error } = await supabase
      .from("items")
      .update({ status: "disposed" })
      .eq("id", itemId)
      .eq("warehouse_id", profile.warehouse_id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/admin/items");
    return { success: true, data: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete item",
    };
  }
}

// ─── Check Out Item (Delivery) ────────────────────────────────────────────────

export async function checkOutItem(input: {
  item_id: string;
  delivery_address: string;
  recipient_name?: string;
  notes?: string;
}): Promise<ActionResult<null>> {
  try {
    const { supabase, user, profile } = await getAuthContext();
    if (!["admin", "staff"].includes(profile.role)) {
      return { success: false, error: "Insufficient permissions" };
    }

    const deliveryNote = [
      `Delivery address: ${input.delivery_address}`,
      input.recipient_name ? `Recipient: ${input.recipient_name}` : null,
      input.notes ? `Notes: ${input.notes}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    const { error } = await supabase
      .from("items")
      .update({
        status: "out_for_delivery",
        notes: deliveryNote,
        created_by: user.id,
      })
      .eq("id", input.item_id)
      .eq("warehouse_id", profile.warehouse_id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/admin/items");
    revalidatePath(`/dashboard/admin/items/${input.item_id}`);
    return { success: true, data: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to check out item",
    };
  }
}

// ─── Get Signed Photo URL ─────────────────────────────────────────────────────

export async function getSignedPhotoUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { supabase } = await getAuthContext();
  const { data } = await supabase.storage
    .from("item-photos")
    .createSignedUrl(storagePath, expiresInSeconds);
  return data?.signedUrl ?? null;
}
