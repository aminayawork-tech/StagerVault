"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ClipboardList, Loader2 } from "lucide-react";
import Link from "next/link";
import { createServiceRequest } from "@/lib/actions/service-requests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SERVICE_TYPES = [
  { value: "delivery", label: "Delivery" },
  { value: "pickup", label: "Pickup" },
  { value: "assembly", label: "Assembly" },
  { value: "disassembly", label: "Disassembly" },
  { value: "staging", label: "Staging" },
  { value: "restaging", label: "Restaging" },
  { value: "other", label: "Other" },
];

interface Props {
  clientId: string;
  items: { id: string; name: string; barcode: string | null; status: string; photoUrl: string | null }[];
}

export function NewServiceRequestForm({ clientId, items }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [serviceType, setServiceType] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  function toggleItem(id: string) {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    if (!serviceType) {
      toast.error("Please select a service type");
      return;
    }

    const title = fd.get("title") as string;
    if (!title?.trim()) {
      toast.error("Please enter a title");
      return;
    }

    setSaving(true);
    try {
      const result = await createServiceRequest({
        client_id: clientId,
        service_type: serviceType as any,
        title: title.trim(),
        description: (fd.get("description") as string) || undefined,
        delivery_address: (fd.get("delivery_address") as string) || undefined,
        requested_date: (fd.get("requested_date") as string) || undefined,
        notes: (fd.get("notes") as string) || undefined,
        item_ids: selectedItems,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Service request submitted!");
      router.push("/dashboard/client/service-requests");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/client/service-requests">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            My Requests
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-orange-500" />
          Request a Service
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Submit a request and we'll get back to you to confirm the details.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Service type */}
            <div className="space-y-1.5">
              <Label>Service Type *</Label>
              <Select onValueChange={setServiceType} value={serviceType}>
                <SelectTrigger>
                  <SelectValue placeholder="What do you need?" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g. Deliver sofa to staging address"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Additional details about what you need…"
                rows={3}
              />
            </div>

            {/* Delivery address */}
            <div className="space-y-1.5">
              <Label htmlFor="delivery_address">Delivery / Staging Address</Label>
              <Input
                id="delivery_address"
                name="delivery_address"
                placeholder="123 Main St, City, State ZIP"
              />
            </div>

            {/* Requested date */}
            <div className="space-y-1.5">
              <Label htmlFor="requested_date">Preferred Date</Label>
              <Input
                id="requested_date"
                name="requested_date"
                type="date"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Access instructions, special handling, etc."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Item selection */}
        {items.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <Label>Related Items (optional)</Label>
              <p className="text-xs text-gray-400">Select which items this request is about.</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {items.map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-colors ${
                      selectedItems.includes(item.id)
                        ? "border-orange-400 bg-orange-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="accent-orange-500 shrink-0"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => toggleItem(item.id)}
                    />
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                      {item.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-300 text-xl">📦</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-gray-900 truncate">{item.name}</span>
                      {item.barcode && (
                        <span className="text-xs text-gray-400 font-mono">{item.barcode}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 capitalize shrink-0">{item.status}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3 pb-4">
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit Request"
            )}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
