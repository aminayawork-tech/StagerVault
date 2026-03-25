"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createLocation, type CreateLocationInput } from "@/lib/actions/locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  zone: z.string().min(1, "Zone is required").max(20),
  aisle: z.string().min(1, "Aisle is required").max(20),
  bay: z.string().min(1, "Bay is required").max(20),
  description: z.string().max(255).optional().nullable(),
  capacity: z.coerce.number().int().min(1).optional().nullable(),
});

interface AddLocationFormProps {
  onClose: () => void;
}

export function AddLocationForm({ onClose }: AddLocationFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateLocationInput>({ resolver: zodResolver(schema) });

  async function onSubmit(values: CreateLocationInput) {
    const result = await createLocation(values);
    if (!result.success) {
      toast.error(result.error ?? "Failed to create location");
      return;
    }
    toast.success("Location created");
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add Location</h2>
            <p className="text-sm text-gray-500 mt-0.5">Label will be generated as Zone-Aisle-Bay (e.g. A-01-03)</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="zone">Zone *</Label>
              <Input id="zone" placeholder="A" {...register("zone")} />
              {errors.zone && <p className="text-sm text-red-500">{errors.zone.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aisle">Aisle *</Label>
              <Input id="aisle" placeholder="01" {...register("aisle")} />
              {errors.aisle && <p className="text-sm text-red-500">{errors.aisle.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bay">Bay *</Label>
              <Input id="bay" placeholder="01" {...register("bay")} />
              {errors.bay && <p className="text-sm text-red-500">{errors.bay.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="capacity">Capacity (max items)</Label>
            <Input id="capacity" type="number" placeholder="50" {...register("capacity")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Input id="description" placeholder="e.g. Climate controlled, near loading dock" {...register("description")} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Add Location"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
