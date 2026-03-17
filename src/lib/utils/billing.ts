"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { calculateStorageDays, calculateStorageCharge } from "./format";

/**
 * Generate a monthly storage invoice for a client.
 * Called by admin action or cron job.
 *
 * Flow:
 * 1. Find all open storage_logs for the client in the period
 * 2. Calculate days × daily_rate for each log
 * 3. Create invoice with line items
 * 4. Mark storage_logs with the invoice_id
 */
export async function generateStorageInvoice({
  warehouseId,
  clientId,
  periodStart,
  periodEnd,
}: {
  warehouseId: string;
  clientId: string;
  periodStart: Date;
  periodEnd: Date;
}) {
  const supabase = createAdminClient(); // bypass RLS for billing operations

  // Fetch warehouse settings for invoice prefix
  const { data: warehouse } = await supabase
    .from("warehouses")
    .select("settings")
    .eq("id", warehouseId)
    .single();

  const prefix = (warehouse?.settings as any)?.invoice_prefix ?? "INV-";
  const dueDays = (warehouse?.settings as any)?.invoice_due_days ?? 30;

  // Count existing invoices to generate sequential number
  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("warehouse_id", warehouseId);

  const invoiceNumber = `${prefix}${String((count ?? 0) + 1).padStart(4, "0")}`;

  // Fetch storage logs that overlap the billing period
  const { data: logs } = await supabase
    .from("storage_logs")
    .select("id, item_id, rate_monthly, check_in_at, check_out_at, item:items(name)")
    .eq("warehouse_id", warehouseId)
    .eq("client_id", clientId)
    .is("invoice_id", null)
    .lte("check_in_at", periodEnd.toISOString());

  if (!logs || logs.length === 0) {
    return { success: false, error: "No billable storage activity for this period" };
  }

  // Calculate line items
  const lineItems = logs.map((log) => {
    const effectiveStart = new Date(
      Math.max(new Date(log.check_in_at).getTime(), periodStart.getTime())
    );
    const effectiveEnd = log.check_out_at
      ? new Date(Math.min(new Date(log.check_out_at).getTime(), periodEnd.getTime()))
      : periodEnd;

    const days = calculateStorageDays(
      effectiveStart.toISOString(),
      effectiveEnd.toISOString()
    );
    const amount = calculateStorageCharge(days, log.rate_monthly);

    return {
      storage_log_id: log.id,
      description: `Storage: ${(log.item as any)?.name ?? log.item_id} (${days} days × $${(log.rate_monthly / 30).toFixed(2)}/day)`,
      quantity: days,
      unit_price: log.rate_monthly / 30,
      total: amount,
      billed_days: days,
      billed_amount: amount,
    };
  });

  const subtotal = lineItems.reduce((sum, li) => sum + li.total, 0);
  const dueDate = new Date(periodEnd);
  dueDate.setDate(dueDate.getDate() + dueDays);

  // Create invoice
  const { data: invoice, error: invError } = await supabase
    .from("invoices")
    .insert({
      warehouse_id: warehouseId,
      client_id: clientId,
      invoice_number: invoiceNumber,
      status: "draft",
      period_start: periodStart.toISOString().split("T")[0],
      period_end: periodEnd.toISOString().split("T")[0],
      subtotal,
      tax: 0,
      total: subtotal,
      due_date: dueDate.toISOString().split("T")[0],
    })
    .select()
    .single();

  if (invError || !invoice) {
    return { success: false, error: invError?.message ?? "Failed to create invoice" };
  }

  // Insert line items
  await supabase.from("invoice_line_items").insert(
    lineItems.map((li) => ({
      invoice_id: invoice.id,
      warehouse_id: warehouseId,
      description: li.description,
      quantity: li.quantity,
      unit_price: li.unit_price,
      total: li.total,
      storage_log_id: li.storage_log_id,
    }))
  );

  // Mark storage logs as billed
  await Promise.all(
    lineItems.map((li) =>
      supabase
        .from("storage_logs")
        .update({
          invoice_id: invoice.id,
          billed_days: li.billed_days,
          billed_amount: li.billed_amount,
        })
        .eq("id", li.storage_log_id)
    )
  );

  return { success: true, invoice };
}
