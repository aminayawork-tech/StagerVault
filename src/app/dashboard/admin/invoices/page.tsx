import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InvoicesPageClient } from "./invoices-page-client";

export const metadata: Metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("warehouse_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "client") redirect("/dashboard/client");

  const [{ data: invoices }, { data: clients }, { data: lineItems }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, client:clients(name)")
      .eq("warehouse_id", profile.warehouse_id)
      .order("created_at", { ascending: false }),

    supabase
      .from("clients")
      .select("id, name")
      .eq("warehouse_id", profile.warehouse_id)
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("invoice_line_items")
      .select("invoice_id, description, quantity, unit_price"),
  ]);

  // Group line items by invoice_id
  const lineItemsByInvoice: Record<string, { description: string; quantity: number; unit_price: number }[]> = {};
  for (const li of lineItems ?? []) {
    if (!lineItemsByInvoice[li.invoice_id]) lineItemsByInvoice[li.invoice_id] = [];
    lineItemsByInvoice[li.invoice_id].push({ description: li.description, quantity: li.quantity, unit_price: li.unit_price });
  }

  return (
    <InvoicesPageClient
      invoices={(invoices as any[]) ?? []}
      clients={clients ?? []}
      lineItemsByInvoice={lineItemsByInvoice}
    />
  );
}
