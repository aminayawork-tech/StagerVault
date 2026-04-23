import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScanPageClient } from "./scan-client";

export const metadata: Metadata = { title: "Scan Item" };

export default async function ScanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("warehouse_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "staff"].includes(profile.role)) redirect("/");

  const { data: locations } = await supabase
    .from("locations")
    .select("id, label, zone, current_count, capacity")
    .eq("warehouse_id", profile.warehouse_id)
    .order("label");

  return <ScanPageClient locations={locations ?? []} />;
}
