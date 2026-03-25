import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "My Invoices" };

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  void: "bg-gray-100 text-gray-400",
};

export default async function ClientInvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client" || !profile.client_id) redirect("/");

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, total, due_date, status, period_start, period_end, notes")
    .eq("client_id", profile.client_id)
    .order("created_at", { ascending: false });

  const outstanding = invoices?.filter((i) => ["sent", "overdue"].includes(i.status)) ?? [];
  const paid = invoices?.filter((i) => i.status === "paid") ?? [];
  const other = invoices?.filter((i) => !["sent", "overdue", "paid"].includes(i.status)) ?? [];

  const totalOutstanding = outstanding.reduce((sum, i) => sum + (i.total ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Invoices</h1>
        <p className="text-sm text-gray-500">{invoices?.length ?? 0} invoices</p>
      </div>

      {outstanding.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-800">Outstanding Balance</p>
              <p className="text-xs text-amber-600 mt-0.5">{outstanding.length} invoice{outstanding.length !== 1 ? "s" : ""} due</p>
            </div>
            <p className="text-2xl font-bold text-amber-900">{formatCurrency(totalOutstanding)}</p>
          </CardContent>
        </Card>
      )}

      {!invoices?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No invoices yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {outstanding.length > 0 && (
            <Section title="Outstanding" invoices={outstanding} />
          )}
          {paid.length > 0 && (
            <Section title="Paid" invoices={paid} />
          )}
          {other.length > 0 && (
            <Section title="Other" invoices={other} />
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, invoices }: { title: string; invoices: any[] }) {
  const STATUS_COLORS: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    sent: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
    void: "bg-gray-100 text-gray-400",
  };

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h2>
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-gray-100">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{inv.invoice_number}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {inv.period_start && inv.period_end
                      ? `${formatDate(inv.period_start)} – ${formatDate(inv.period_end)}`
                      : inv.due_date
                      ? `Due ${formatDate(inv.due_date)}`
                      : ""}
                  </p>
                  {inv.notes && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{inv.notes}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(inv.total)}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[inv.status] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {inv.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
