import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientsPageClient } from "./clients-page-client";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("warehouse_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "client") redirect("/dashboard/client");

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .eq("warehouse_id", profile.warehouse_id)
    .order("name");

  return <ClientsPageClient clients={clients ?? []} isAdmin={profile.role === "admin"} />;
}
