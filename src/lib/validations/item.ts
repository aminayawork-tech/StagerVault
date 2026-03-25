import { z } from "zod";

export const itemStatusValues = [
  "pending_intake",
  "received",
  "stored",
  "assembled",
  "staged",
  "out_for_delivery",
  "delivered",
  "returned",
  "damaged",
  "disposed",
] as const;

export const itemConditionValues = [
  "excellent",
  "good",
  "fair",
  "damaged",
  "unknown",
] as const;

export const createItemSchema = z.object({
  client_id: z.string().uuid("Select a client"),
  name: z.string().min(1, "Item name is required").max(255),
  description: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  condition: z.enum(itemConditionValues),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").default(1),
  location_id: z.string().uuid().optional().nullable(),
  barcode: z.string().max(100).optional().nullable(),
  width_in: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().positive().nullable().optional()),
  height_in: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().positive().nullable().optional()),
  depth_in: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().positive().nullable().optional()),
  weight_lbs: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().positive().nullable().optional()),
  purchase_price: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(0).nullable().optional()),
  notes: z.string().max(2000).optional().nullable(),
  mydarby_id: z.string().max(100).optional().nullable(),
});

export const updateItemSchema = createItemSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(itemStatusValues).optional(),
});

export const moveItemSchema = z.object({
  item_id: z.string().uuid(),
  to_location_id: z.string().uuid().nullable(),
  notes: z.string().max(500).optional(),
});

export const updateItemStatusSchema = z.object({
  item_id: z.string().uuid(),
  status: z.enum(itemStatusValues),
  condition: z.enum(itemConditionValues).optional(),
  notes: z.string().max(500).optional(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type MoveItemInput = z.infer<typeof moveItemSchema>;
export type UpdateItemStatusInput = z.infer<typeof updateItemStatusSchema>;
