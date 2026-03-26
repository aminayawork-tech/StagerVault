import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Invoice" };

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  void: "bg-gray-100 text-gray-400",
};

export default async function ClientInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client" || !profile.client_id) redirect("/");

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("client_id", profile.client_id)
    .single();

  if (!invoice) notFound();

  const { data: lineItems } = await supabase
    .from("invoice_line_items")
    .select("description, quantity, unit_price, total")
    .eq("invoice_id", id)
    .order("created_at");

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/client/invoices">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            My Invoices
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-500" />
            <h1 className="text-xl font-bold text-gray-900">{invoice.invoice_number}</h1>
          </div>
          {invoice.period_start && invoice.period_end && (
            <p className="text-sm text-gray-500 mt-0.5">
              Period: {formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}
            </p>
          )}
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium shrink-0 capitalize ${STATUS_COLORS[invoice.status] ?? "bg-gray-100 text-gray-600"}`}>
          {invoice.status}
        </span>
      </div>

      {/* Due date banner for outstanding */}
      {["sent", "overdue"].includes(invoice.status) && invoice.due_date && (
        <Card className={`border-amber-200 bg-amber-50`}>
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-sm font-medium text-amber-800">
              {invoice.status === "overdue" ? "Payment overdue" : "Payment due"}
            </p>
            <p className="text-sm font-bold text-amber-900">{formatDate(invoice.due_date)}</p>
          </CardContent>
        </Card>
      )}

      {/* Line items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-500">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {lineItems && lineItems.length > 0 ? (
            <>
              <ul className="divide-y divide-gray-100">
                {lineItems.map((item, i) => (
                  <li key={i} className="flex items-center justify-between px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{item.description}</p>
                      {item.quantity > 1 && (
                        <p className="text-xs text-gray-400">
                          {item.quantity} × {formatCurrency(item.unit_price)}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 shrink-0 ml-4">
                      {formatCurrency(item.total)}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-sm font-semibold text-gray-700">Total</p>
                <p className="text-base font-bold text-gray-900">{formatCurrency(invoice.total)}</p>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-base font-bold text-gray-900">{formatCurrency(invoice.total)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
