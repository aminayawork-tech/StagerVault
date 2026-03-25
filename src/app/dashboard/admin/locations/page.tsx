import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LocationsPageClient } from "./locations-page-client";

export const metadata: Metadata = { title: "Locations" };

export default async function LocationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("warehouse_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "client") redirect("/dashboard/client");

  const { data: locations } = await supabase
    .from("locations")
    .select("*")
    .eq("warehouse_id", profile.warehouse_id)
    .eq("is_active", true)
    .order("zone")
    .order("aisle")
    .order("bay");

  return <LocationsPageClient locations={locations ?? []} isAdmin={profile.role === "admin"} />;
}
