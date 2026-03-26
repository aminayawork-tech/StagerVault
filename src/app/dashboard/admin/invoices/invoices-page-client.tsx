"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Send, CheckCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateInvoiceForm } from "@/components/forms/create-invoice-form";
import { EditInvoiceForm } from "@/components/forms/edit-invoice-form";
import { updateInvoiceStatus } from "@/lib/actions/invoices";
import { formatCurrency, formatDate } from "@/lib/utils/format";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  void: "bg-gray-100 text-gray-400",
};

interface Invoice {
  id: string;
  invoice_number: string;
  total: number;
  due_date: string | null;
  status: string;
  period_start: string | null;
  period_end: string | null;
  notes: string | null;
  client: { name: string } | null;
}

interface InvoicesPageClientProps {
  invoices: Invoice[];
  clients: { id: string; name: string }[];
  lineItemsByInvoice: Record<string, { description: string; quantity: number; unit_price: number }[]>;
}

export function InvoicesPageClient({ invoices, clients, lineItemsByInvoice }: InvoicesPageClientProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleMarkSent(invoiceId: string) {
    setUpdatingId(invoiceId);
    const result = await updateInvoiceStatus(invoiceId, "sent");
    setUpdatingId(null);
    if (!result.success) { toast.error(result.error ?? "Failed"); return; }
    toast.success("Invoice marked as sent");
    router.refresh();
  }

  async function handleMarkPaid(invoiceId: string) {
    setUpdatingId(invoiceId);
    const result = await updateInvoiceStatus(invoiceId, "paid");
    setUpdatingId(null);
    if (!result.success) { toast.error(result.error ?? "Failed"); return; }
    toast.success("Invoice marked as paid");
    router.refresh();
  }

  const totalOutstanding = invoices
    .filter((i) => ["sent", "overdue"].includes(i.status))
    .reduce((sum, i) => sum + (i.total ?? 0), 0);

  return (
    <>
      {showCreate && (
        <CreateInvoiceForm clients={clients} onClose={() => setShowCreate(false)} />
      )}
      {editingInvoice && (
        <EditInvoiceForm
          invoice={editingInvoice}
          lineItems={lineItemsByInvoice[editingInvoice.id] ?? []}
          onClose={() => setEditingInvoice(null)}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="text-sm text-gray-500 mt-0.5">{invoices.length} invoices</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </div>

        {invoices.filter((i) => ["sent", "overdue"].includes(i.status)).length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-800">Outstanding</p>
                <p className="text-xs text-amber-600">
                  {invoices.filter((i) => ["sent", "overdue"].includes(i.status)).length} invoices unpaid
                </p>
              </div>
              <p className="text-2xl font-bold text-amber-900">{formatCurrency(totalOutstanding)}</p>
            </CardContent>
          </Card>
        )}

        {!invoices.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No invoices yet</p>
              <p className="text-sm text-gray-400 mt-1">Create your first invoice to get started.</p>
              <Button className="mt-4" onClick={() => setShowCreate(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <li key={inv.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {inv.client?.name}
                        {inv.period_start && inv.period_end
                          ? ` · ${formatDate(inv.period_start)} – ${formatDate(inv.period_end)}`
                          : inv.due_date
                          ? ` · Due ${formatDate(inv.due_date)}`
                          : ""}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 shrink-0">
                      {formatCurrency(inv.total)}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[inv.status] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {inv.status}
                    </span>
                    <div className="flex gap-1.5 shrink-0">
                      {inv.status === "draft" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingInvoice(inv)}
                            className="text-gray-600 border-gray-200 hover:bg-gray-50 text-xs"
                          >
                            <Pencil className="mr-1.5 h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={updatingId === inv.id}
                            onClick={() => handleMarkSent(inv.id)}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs"
                          >
                            <Send className="mr-1.5 h-3 w-3" />
                            Send
                          </Button>
                        </>
                      )}
                      {["sent", "overdue"].includes(inv.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={updatingId === inv.id}
                          onClick={() => handleMarkPaid(inv.id)}
                          className="text-green-600 border-green-200 hover:bg-green-50 text-xs"
                        >
                          <CheckCircle className="mr-1.5 h-3 w-3" />
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
