"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X, Truck } from "lucide-react";
import { toast } from "sonner";
import { checkOutItem } from "@/lib/actions/items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DeliverItemModalProps {
  itemId: string;
  itemName: string;
  onClose: () => void;
}

export function DeliverItemModal({ itemId, itemName, onClose }: DeliverItemModalProps) {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [recipient, setRecipient] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) {
      toast.error("Delivery address is required");
      return;
    }
    setLoading(true);
    const result = await checkOutItem({
      item_id: itemId,
      delivery_address: address,
      recipient_name: recipient || undefined,
      notes: notes || undefined,
    });
    setLoading(false);
    if (!result.success) {
      toast.error(result.error ?? "Failed to check out item");
      return;
    }
    toast.success(`${itemName} marked as out for delivery`);
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">Deliver Item</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-500">
            Mark <span className="font-medium text-gray-800">{itemName}</span> as out for delivery.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="address">Delivery Address *</Label>
            <Textarea
              id="address"
              placeholder="123 Main St, New York, NY 10001"
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recipient">Recipient Name</Label>
            <Input
              id="recipient"
              placeholder="Jane Smith"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Delivery Notes</Label>
            <Input
              id="notes"
              placeholder="Leave at door, ring bell, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
              ) : (
                <><Truck className="mr-2 h-4 w-4" />Confirm Delivery</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
