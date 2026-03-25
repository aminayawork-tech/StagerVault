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

  // Load client's items for optional linking
  const { data: items } = await supabase
    .from("items")
    .select("id, name, barcode, status")
    .eq("client_id", profile.client_id)
    .not("status", "eq", "delivered")
    .order("name");

  return (
    <NewServiceRequestForm
      clientId={profile.client_id}
      items={items ?? []}
    />
  );
}
