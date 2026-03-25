"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createClientSchema, type CreateClientInput } from "@/lib/validations/client";
import { createNewClient } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddClientFormProps {
  onClose: () => void;
}

export function AddClientForm({ onClose }: AddClientFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateClientInput>({ resolver: zodResolver(createClientSchema) });

  async function onSubmit(values: CreateClientInput) {
    const result = await createNewClient(values);
    if (!result.success) {
      toast.error(result.error ?? "Failed to create client");
      return;
    }
    toast.success("Client created successfully");
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Add Client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Company Name *</Label>
            <Input id="name" placeholder="Jane's Interiors LLC" {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input id="contact_name" placeholder="Jane Smith" {...register("contact_name")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="jane@example.com" {...register("email")} />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="555-1234" {...register("phone")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="billing_rate_monthly">Monthly Rate ($/item)</Label>
              <Input id="billing_rate_monthly" type="number" step="0.01" placeholder="25.00" {...register("billing_rate_monthly")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Billing Cycle</Label>
            <Select defaultValue="monthly" onValueChange={(v) => setValue("billing_cycle", v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="per_item">Per Item</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" placeholder="123 Main St" {...register("address")} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="city">City</Label>
              <Input id="city" placeholder="New York" {...register("city")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input id="state" placeholder="NY" {...register("state")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zip">ZIP</Label>
              <Input id="zip" placeholder="10001" {...register("zip")} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Add Client"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
