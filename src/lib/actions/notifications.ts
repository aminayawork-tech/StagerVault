"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function markNotificationRead(notificationId: string): Promise<ActionResult<null>> {
  try {
    const { supabase, user } = await getAuthContext();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("profile_id", user.id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard/notifications");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function markAllNotificationsRead(): Promise<ActionResult<null>> {
  try {
    const { supabase, user } = await getAuthContext();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("profile_id", user.id)
      .eq("is_read", false);

    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard/notifications");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed" };
  }
}
