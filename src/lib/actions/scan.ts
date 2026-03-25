"use server";

import { createClient } from "@/lib/supabase/server";

export interface ScanResult {
  found: boolean;
  item?: {
    id: string;
    name: string;
    status: string;
    condition: string;
    barcode: string | null;
    quantity: number;
    primary_photo_url: string | null;
    staged_address: string | null;
    scheduled_pickup_at: string | null;
    client: { name: string } | null;
    location: { label: string } | null;
  };
}

export async function lookupByBarcode(barcode: string): Promise<ScanResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { found: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("warehouse_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "staff"].includes(profile.role)) return { found: false };

  const { data: item } = await supabase
    .from("items")
    .select("id, name, status, condition, barcode, quantity, primary_photo_url, staged_address, scheduled_pickup_at, client:clients(name), location:locations(label)")
    .eq("warehouse_id", profile.warehouse_id)
    .eq("barcode", barcode)
    .neq("status", "disposed")
    .single();

  if (!item) return { found: false };

  return { found: true, item: item as any };
}
