"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { createInvoice } from "@/lib/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils/format";

interface CreateInvoiceFormProps {
  clients: { id: string; name: string }[];
  onClose: () => void;
}

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export function CreateInvoiceForm({ clients, onClose }: CreateInvoiceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "Storage fee", quantity: 1, unit_price: 0 },
  ]);

  const total = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  function addLineItem() {
    setLineItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0 }]);
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string | number) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) { toast.error("Select a client"); return; }
    if (!periodStart || !periodEnd) { toast.error("Set the billing period"); return; }
    if (lineItems.some((i) => !i.description.trim())) { toast.error("All line items need a description"); return; }

    setLoading(true);
    const result = await createInvoice({
      client_id: clientId,
      period_start: periodStart,
      period_end: periodEnd,
      due_date: dueDate || null,
      notes: notes || null,
      line_items: lineItems.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
    });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to create invoice");
      return;
    }

    toast.success(`Invoice ${result.data?.invoice_number} created`);
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-vault-500" />
            <h2 className="text-lg font-semibold text-gray-900">New Invoice</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Client */}
          <div className="space-y-1.5">
            <Label>Client *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Billing period */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Period Start *</Label>
              <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Period End *</Label>
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5 w-48">
            <Label>Due Date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          {/* Line items */}
          <div className="space-y-3">
            <Label>Line Items *</Label>
            {lineItems.map((item, index) => (
              <div key={index} className="flex gap-2 items-start">
                <Input
                  className="flex-1"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateLineItem(index, "description", e.target.value)}
                />
                <Input
                  className="w-20"
                  type="number"
                  min={1}
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, "quantity", parseInt(e.target.value) || 1)}
                />
                <div className="relative w-28">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <Input
                    className="pl-6"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    value={item.unit_price || ""}
                    onChange={(e) => updateLineItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="w-20 text-right text-sm text-gray-600 pt-2.5 shrink-0">
                  {formatCurrency(item.quantity * item.unit_price)}
                </div>
                {lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    className="text-gray-400 hover:text-red-500 pt-2.5 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Line Item
            </Button>
          </div>

          {/* Total */}
          <div className="flex justify-end border-t pt-3">
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(total)}</p>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional notes for the client…"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>
              ) : (
                <><FileText className="mr-2 h-4 w-4" />Create Invoice</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
