import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewServiceRequestForm } from "./new-service-request-form";

export const metadata: Metadata = { title: "Request a Service" };

export default async function NewServiceRequestPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id, role, warehouse_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client" || !profile.client_id) redirect("/");

  // Load client's items with photo
  const { data: items } = await supabase
    .from("items")
    .select("id, name, barcode, status, primary_photo_url")
    .eq("client_id", profile.client_id)
    .not("status", "eq", "delivered")
    .not("status", "eq", "disposed")
    .order("name");

  const itemsWithPhotos = (items ?? []).map((item: any) => ({
    id: item.id,
    name: item.name,
    barcode: item.barcode,
    status: item.status,
    photoUrl: item.primary_photo_url ?? null,
  }));

  return (
    <NewServiceRequestForm
      clientId={profile.client_id}
      items={itemsWithPhotos}
    />
  );
}
