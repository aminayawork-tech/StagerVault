import { z } from "zod";

export const serviceTypeValues = [
  "delivery",
  "pickup",
  "assembly",
  "disassembly",
  "staging",
  "restaging",
  "receiving",
  "storage",
  "white_glove_delivery",
  "inspection",
  "disposal",
  "other",
] as const;

export const serviceRequestStatusValues = [
  "draft",
  "submitted",
  "accepted",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export const createServiceRequestSchema = z.object({
  client_id: z.string().uuid("Select a client"),
  service_type: z.enum(serviceTypeValues),
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(2000).optional().nullable(),
  delivery_address: z.string().max(500).optional().nullable(),
  requested_date: z.string().optional().nullable(), // ISO date string
  price: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  item_ids: z.array(z.string().uuid()).default([]),
});

export const updateServiceRequestSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(serviceRequestStatusValues).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  scheduled_date: z.string().optional().nullable(),
  price: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  delivery_address: z.string().max(500).optional().nullable(),
});

export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>;
export type UpdateServiceRequestInput = z.infer<typeof updateServiceRequestSchema>;
