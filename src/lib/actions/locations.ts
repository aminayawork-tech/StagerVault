"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { ActionResult } from "@/types";

const createLocationSchema = z.object({
  zone: z.string().min(1, "Zone is required").max(20),
  aisle: z.string().min(1, "Aisle is required").max(20),
  bay: z.string().min(1, "Bay is required").max(20),
  description: z.string().max(255).optional().nullable(),
  capacity: z.coerce.number().int().min(1).optional().nullable(),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;

export async function createLocation(
  input: CreateLocationInput
): Promise<ActionResult<null>> {
  try {
    const validated = createLocationSchema.parse(input);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabase
      .from("profiles")
      .select("warehouse_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") throw new Error("Admin access required");

    const { error } = await supabase
      .from("locations")
      .insert({ ...validated, warehouse_id: profile.warehouse_id });

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/admin/locations");
    return { success: true, data: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create location",
    };
  }
}

export type UpdateLocationInput = z.infer<typeof createLocationSchema>;

export async function updateLocation(
  id: string,
  input: UpdateLocationInput
): Promise<ActionResult<null>> {
  try {
    const validated = createLocationSchema.parse(input);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabase
      .from("profiles")
      .select("warehouse_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") throw new Error("Admin access required");

    const label = `${validated.zone}-${validated.aisle}-${validated.bay}`;

    const { error } = await supabase
      .from("locations")
      .update({ ...validated, label })
      .eq("id", id)
      .eq("warehouse_id", profile.warehouse_id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/admin/locations");
    revalidatePath(`/dashboard/admin/locations/${id}`);
    return { success: true, data: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update location",
    };
  }
}
