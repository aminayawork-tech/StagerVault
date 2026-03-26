"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { ActionResult } from "@/types";

async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("warehouse_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");
  return { supabase, user, profile };
}

const createInvoiceSchema = z.object({
  client_id: z.string().uuid("Select a client"),
  period_start: z.string().min(1, "Period start is required"),
  period_end: z.string().min(1, "Period end is required"),
  due_date: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  line_items: z.array(
    z.object({
      description: z.string().min(1),
      quantity: z.number().int().min(1).default(1),
      unit_price: z.number().min(0),
    })
  ).min(1, "Add at least one line item"),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export async function createInvoice(
  input: CreateInvoiceInput
): Promise<ActionResult<{ id: string; invoice_number: string }>> {
  try {
    const validated = createInvoiceSchema.parse(input);
    const { supabase, profile } = await getAuthContext();

    if (profile.role !== "admin") {
      return { success: false, error: "Only admins can create invoices" };
    }

    const total = validated.line_items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    );

    // Generate invoice number: INV-YYYYMM-XXXX
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const suffix = Math.floor(1000 + Math.random() * 9000); // 4-digit random
    const invoiceNumber = `INV-${yyyymm}-${suffix}`;

    const { data: invoice, error } = await supabase
      .from("invoices")
      .insert({
        client_id: validated.client_id,
        warehouse_id: profile.warehouse_id,
        invoice_number: invoiceNumber,
        period_start: validated.period_start,
        period_end: validated.period_end,
        due_date: validated.due_date ?? null,
        notes: validated.notes ?? null,
        status: "draft",
        total,
      })
      .select("id, invoice_number")
      .single();

    if (error) return { success: false, error: error.message };

    // Insert line items if table exists (graceful fail)
    await supabase.from("invoice_line_items").insert(
      validated.line_items.map((item) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
      }))
    );

    revalidatePath("/dashboard/admin/invoices");
    return { success: true, data: invoice };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create invoice",
    };
  }
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: "draft" | "sent" | "paid" | "overdue" | "void"
): Promise<ActionResult<null>> {
  try {
    const { supabase, profile } = await getAuthContext();

    if (profile.role !== "admin") {
      return { success: false, error: "Only admins can update invoice status" };
    }

    const { data: invoice, error } = await supabase
      .from("invoices")
      .update({ status })
      .eq("id", invoiceId)
      .eq("warehouse_id", profile.warehouse_id)
      .select("id, invoice_number, total, client_id")
      .single();

    if (error) return { success: false, error: error.message };

    // When sending, notify the client
    if (status === "sent" && invoice) {
      const { data: clientProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("client_id", invoice.client_id)
        .eq("role", "client")
        .maybeSingle();

      if (clientProfile) {
        await supabase.from("notifications").insert({
          warehouse_id: profile.warehouse_id,
          profile_id: clientProfile.id,
          title: `Invoice ${invoice.invoice_number} received`,
          body: `You have a new invoice for $${Number(invoice.total).toFixed(2)}. Please review and arrange payment.`,
          type: "invoice_sent",
          reference_id: invoice.id,
        });
      }
    }

    revalidatePath("/dashboard/admin/invoices");
    revalidatePath("/dashboard/client/invoices");
    revalidatePath("/dashboard/notifications");
    return { success: true, data: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update invoice",
    };
  }
}
