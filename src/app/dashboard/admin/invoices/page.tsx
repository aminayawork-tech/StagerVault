import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileText, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Invoices" };

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  void: "bg-gray-100 text-gray-400",
};

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

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, client:clients(name)")
    .eq("warehouse_id", profile.warehouse_id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">{invoices?.length ?? 0} invoices</p>
        </div>
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" />
          New Invoice
        </Button>
      </div>

      {!invoices?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No invoices yet</p>
            <p className="text-sm text-gray-400 mt-1">Invoices will appear here once created for client storage and services.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-gray-100">
              {invoices.map((inv: any) => (
                <li key={inv.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{inv.invoice_number}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {inv.client?.name}
                      {inv.due_date ? ` · Due ${formatDate(inv.due_date)}` : ""}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(inv.total)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[inv.status] ?? "bg-gray-100 text-gray-700"}`}>
                    {inv.status}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
