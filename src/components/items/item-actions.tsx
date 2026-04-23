"use client";

import { useState } from "react";
import { Truck, CheckCircle, RotateCcw, MoveRight, Printer, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeliverItemModal } from "./deliver-item-modal";
import { updateItemStatus, returnToWarehouse, moveItem } from "@/lib/actions/items";

interface Location {
  id: string;
  label: string;
  current_count: number;
  capacity: number | null;
}

interface ItemActionsProps {
  itemId: string;
  itemName: string;
  itemBarcode: string;
  itemDescription?: string;
  currentStatus: string;
  currentLocationId?: string | null;
  locations?: Location[];
}

export function ItemActions({
  itemId, itemName, itemBarcode, itemDescription, currentStatus, currentLocationId, locations = [],
}: ItemActionsProps) {
  const router = useRouter();
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveToLocationId, setMoveToLocationId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const canDeliver = ["received", "stored", "assembled"].includes(currentStatus);
  const canMarkDelivered = currentStatus === "out_for_delivery";
  const canReturn = currentStatus === "staged";
  const canMove = ["received", "stored", "assembled"].includes(currentStatus);

  async function handleMarkDelivered() {
    if (!confirm(`Mark "${itemName}" as delivered?`)) return;
    setLoading(true);
    const result = await updateItemStatus({ item_id: itemId, status: "delivered" });
    setLoading(false);
    if (!result.success) { toast.error(result.error ?? "Failed to update status"); return; }
    toast.success("Item marked as delivered");
    router.refresh();
  }

  async function handleReturn() {
    if (!confirm(`Return "${itemName}" to warehouse?`)) return;
    setLoading(true);
    const result = await returnToWarehouse({ item_id: itemId });
    setLoading(false);
    if (!result.success) { toast.error(result.error ?? "Failed to return item"); return; }
    toast.success("Item returned to warehouse");
    router.refresh();
  }

  async function handleMove() {
    if (!moveToLocationId) { toast.error("Select a location"); return; }
    setLoading(true);
    const result = await moveItem({
      item_id: itemId,
      to_location_id: moveToLocationId === "unassigned" ? null : moveToLocationId,
    });
    setLoading(false);
    if (!result.success) { toast.error(result.error ?? "Failed to move item"); return; }
    const loc = locations.find((l) => l.id === moveToLocationId);
    toast.success(`Moved to ${loc?.label ?? "new location"}`);
    setShowMoveModal(false);
    router.refresh();
  }

  function handlePrintLabel() {
    const win = window.open("", "_blank", "width=420,height=320");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head><title>Item Label</title>
      <style>
        body{font-family:Arial,sans-serif;margin:0;padding:16px;}
        .label{border:2px solid #000;padding:14px;width:340px;}
        .sku{font-size:11px;color:#555;margin-bottom:2px;}
        .barcode{font-family:monospace;font-size:30px;letter-spacing:5px;margin:6px 0;}
        .name{font-size:15px;font-weight:bold;margin:4px 0;}
        .desc{font-size:12px;color:#333;margin-top:4px;white-space:pre-wrap;}
        .brand{font-size:10px;color:#888;margin-top:10px;}
        @media print{body{margin:0;}}
      </style></head><body>
      <div class="label">
        <p class="sku">SKU: ${itemBarcode}</p>
        <p class="barcode">|||||||||||</p>
        <p class="name">${itemName}</p>
        ${itemDescription ? `<p class="desc">${itemDescription}</p>` : ""}
        <p class="brand">StagerVault · ${new Date().toLocaleDateString()}</p>
      </div>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>
    `);
    win.document.close();
  }

  return (
    <>
      {showDeliverModal && (
        <DeliverItemModal itemId={itemId} itemName={itemName} onClose={() => setShowDeliverModal(false)} />
      )}

      {/* Move modal */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-base font-semibold text-gray-900">Move Item</h2>
              <button onClick={() => setShowMoveModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">Select new warehouse location for <strong>{itemName}</strong></p>
              <Select value={moveToLocationId} onValueChange={setMoveToLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose location…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem
                      key={loc.id}
                      value={loc.id}
                      disabled={loc.capacity != null && loc.current_count >= loc.capacity && loc.id !== currentLocationId}
                    >
                      {loc.label}
                      {loc.capacity != null && (
                        <span className="ml-2 text-xs text-gray-400">({loc.current_count}/{loc.capacity})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-3 pt-1">
                <Button onClick={handleMove} disabled={!moveToLocationId || loading} className="flex-1">
                  {loading ? "Moving…" : "Confirm Move"}
                </Button>
                <Button variant="outline" onClick={() => setShowMoveModal(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canDeliver && (
          <Button variant="outline" size="sm" onClick={() => setShowDeliverModal(true)}
            className="text-amber-600 border-amber-200 hover:bg-amber-50">
            <Truck className="mr-2 h-4 w-4" />
            Stage for Delivery
          </Button>
        )}
        {canMarkDelivered && (
          <Button variant="outline" size="sm" onClick={handleMarkDelivered} disabled={loading}
            className="text-green-600 border-green-200 hover:bg-green-50">
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark Delivered
          </Button>
        )}
        {canReturn && (
          <Button variant="outline" size="sm" onClick={handleReturn} disabled={loading}
            className="text-blue-600 border-blue-200 hover:bg-blue-50">
            <RotateCcw className="mr-2 h-4 w-4" />
            Return to Warehouse
          </Button>
        )}
        {canMove && (
          <Button variant="outline" size="sm" onClick={() => { setMoveToLocationId(""); setShowMoveModal(true); }}>
            <MoveRight className="mr-2 h-4 w-4" />
            Move
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handlePrintLabel}>
          <Printer className="mr-2 h-4 w-4" />
          Print Label
        </Button>
      </div>
    </>
  );
}
