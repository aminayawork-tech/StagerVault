"use client";

import { useState } from "react";
import { Truck, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DeliverItemModal } from "./deliver-item-modal";
import { updateItemStatus } from "@/lib/actions/items";

interface ItemActionsProps {
  itemId: string;
  itemName: string;
  currentStatus: string;
}

export function ItemActions({ itemId, itemName, currentStatus }: ItemActionsProps) {
  const router = useRouter();
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const canDeliver = ["received", "stored", "assembled", "staged"].includes(currentStatus);
  const canMarkDelivered = currentStatus === "out_for_delivery";

  async function handleMarkDelivered() {
    if (!confirm(`Mark "${itemName}" as delivered?`)) return;
    setLoading(true);
    const result = await updateItemStatus({ item_id: itemId, status: "delivered" });
    setLoading(false);
    if (!result.success) {
      toast.error(result.error ?? "Failed to update status");
      return;
    }
    toast.success("Item marked as delivered");
    router.refresh();
  }

  if (!canDeliver && !canMarkDelivered) return null;

  return (
    <>
      {showDeliverModal && (
        <DeliverItemModal
          itemId={itemId}
          itemName={itemName}
          onClose={() => setShowDeliverModal(false)}
        />
      )}
      <div className="flex gap-2">
        {canDeliver && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeliverModal(true)}
            className="text-amber-600 border-amber-200 hover:bg-amber-50"
          >
            <Truck className="mr-2 h-4 w-4" />
            Deliver
          </Button>
        )}
        {canMarkDelivered && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkDelivered}
            disabled={loading}
            className="text-green-600 border-green-200 hover:bg-green-50"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark Delivered
          </Button>
        )}
      </div>
    </>
  );
}
