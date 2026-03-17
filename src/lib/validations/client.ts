import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1, "Company name is required").max(255),
  contact_name: z.string().max(255).optional().nullable(),
  email: z.string().email("Enter a valid email").optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  zip: z.string().max(20).optional().nullable(),
  billing_rate_monthly: z.coerce.number().min(0).optional().nullable(),
  billing_cycle: z.enum(["monthly", "weekly", "per_item"]).default("monthly"),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateClientSchema = createClientSchema.partial().extend({
  id: z.string().uuid(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
