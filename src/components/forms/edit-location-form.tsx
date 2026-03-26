"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateLocation } from "@/lib/actions/locations";

interface Props {
  location: {
    id: string;
    zone: string;
    aisle: string;
    bay: string;
    capacity: number | null;
    description: string | null;
  };
}

export function EditLocationForm({ location }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    const result = await updateLocation(location.id, {
      zone: fd.get("zone") as string,
      aisle: fd.get("aisle") as string,
      bay: fd.get("bay") as string,
      capacity: fd.get("capacity") ? Number(fd.get("capacity")) : null,
      description: (fd.get("description") as string) || null,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Location updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="mr-1.5 h-3.5 w-3.5" />
        Edit Location
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Edit Location</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="zone">Zone *</Label>
                  <Input id="zone" name="zone" defaultValue={location.zone} required maxLength={20} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="aisle">Aisle *</Label>
                  <Input id="aisle" name="aisle" defaultValue={location.aisle} required maxLength={20} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bay">Bay *</Label>
                  <Input id="bay" name="bay" defaultValue={location.bay} required maxLength={20} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="capacity">Capacity (items)</Label>
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  min={1}
                  defaultValue={location.capacity ?? ""}
                  placeholder="No limit"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={location.description ?? ""}
                  rows={2}
                  placeholder="Optional notes"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
