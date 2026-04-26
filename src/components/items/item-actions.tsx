"use client";

import { useState } from "react";
import { Truck, CheckCircle, RotateCcw, MoveRight, Printer, X, ScanLine, MapPin, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarcodeScanner } from "./barcode-scanner";
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

type MovePhase = "location" | "scan-pickup" | "scan-placement";

export function ItemActions({
  itemId, itemName, itemBarcode, itemDescription,
  currentStatus, currentLocationId, locations = [],
}: ItemActionsProps) {
  const router = useRouter();
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [movePhase, setMovePhase] = useState<MovePhase>("location");
  const [moveToLocationId, setMoveToLocationId] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);

  const canDeliver = ["received", "stored", "assembled"].includes(currentStatus);
  const canMarkDelivered = currentStatus === "out_for_delivery";
  const canReturn = currentStatus === "staged";
  const canMove = ["received", "stored", "assembled"].includes(currentStatus);

  function openMoveModal() {
    setMoveToLocationId("");
    setMovePhase("location");
    setManualInput("");
    setShowCamera(false);
    setShowMoveModal(true);
  }

  function closeMoveModal() {
    setShowCamera(false);
    setShowMoveModal(false);
  }

  async function handleMarkDelivered() {
    if (!confirm(`Mark "${itemName}" as delivered?`)) return;
    setLoading(true);
    const result = await updateItemStatus({ item_id: itemId, status: "delivered" });
    setLoading(false);
    if (!result.success) { toast.error(result.error ?? "Failed"); return; }
    toast.success("Item marked as delivered");
    router.refresh();
  }

  async function handleReturn() {
    if (!confirm(`Return "${itemName}" to warehouse?`)) return;
    setLoading(true);
    const result = await returnToWarehouse({ item_id: itemId });
    setLoading(false);
    if (!result.success) { toast.error(result.error ?? "Failed"); return; }
    toast.success("Item returned to warehouse");
    router.refresh();
  }

  // Step 2: scan at pickup location — verifies correct item
  function handlePickupScan(code: string) {
    setShowCamera(false);
    if (code.trim() !== itemBarcode.trim()) {
      toast.error(`Wrong item scanned. Expected: ${itemBarcode}`);
      return;
    }
    toast.success("Item verified — now move it to the destination");
    setManualInput("");
    setMovePhase("scan-placement");
  }

  // Step 3: scan at placement location — confirms item was placed
  async function handlePlacementScan(code: string) {
    setShowCamera(false);
    if (code.trim() !== itemBarcode.trim()) {
      toast.error(`Wrong item scanned. Expected: ${itemBarcode}`);
      return;
    }
    setLoading(true);
    const result = await moveItem({
      item_id: itemId,
      to_location_id: moveToLocationId === "unassigned" ? null : moveToLocationId,
    });
    setLoading(false);
    if (!result.success) { toast.error(result.error ?? "Failed to move item"); return; }
    const loc = locations.find((l) => l.id === moveToLocationId);
    toast.success(`Moved to ${loc?.label ?? "new location"}`);
    closeMoveModal();
    router.refresh();
  }

  function handlePrintLabel() {
    const win = window.open("", "_blank", "width=440,height=380");
    if (!win) return;
    const desc = itemDescription ?? "";
    win.document.write(`<!DOCTYPE html><html><head><title>Item Label</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
      <style>
        body{font-family:Arial,sans-serif;margin:0;padding:16px;background:#fff;}
        .label{border:2px solid #000;padding:14px;width:360px;box-sizing:border-box;}
        svg{display:block;width:100%;height:auto;}
        .name{font-size:15px;font-weight:bold;margin:6px 0 2px;}
        .desc{font-size:11px;color:#333;margin-top:2px;white-space:pre-wrap;}
        .brand{font-size:10px;color:#888;margin-top:8px;border-top:1px solid #eee;padding-top:6px;}
        @media print{body{margin:0;padding:8px;}}
      </style></head><body>
      <div class="label">
        <svg id="bc"></svg>
        <p class="name">${itemName.replace(/</g, "&lt;")}</p>
        ${desc ? `<p class="desc">${desc.replace(/</g, "&lt;")}</p>` : ""}
        <p class="brand">StagerVault &middot; ${new Date().toLocaleDateString()}</p>
      </div>
      <script>
        window.onload = function() {
          JsBarcode("#bc", ${JSON.stringify(itemBarcode)}, {
            format:"CODE128", width:2, height:60, displayValue:true, fontSize:13, margin:6
          });
          window.print();
        };
      <\/script></body></html>`);
    win.document.close();
  }

  const targetLocation = locations.find((l) => l.id === moveToLocationId);
  const currentLocation = locations.find((l) => l.id === currentLocationId) ?? null;

  return (
    <>
      {showDeliverModal && (
        <DeliverItemModal itemId={itemId} itemName={itemName} onClose={() => setShowDeliverModal(false)} />
      )}

      {/* ── Move modal ── */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Move Item</h2>
                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[220px]">{itemName}</p>
              </div>
              <button onClick={closeMoveModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Step indicators */}
            <div className="flex items-center gap-0 px-5 py-3 bg-gray-50 border-b text-xs font-medium">
              {[
                { n: 1, label: "Destination", phase: "location" },
                { n: 2, label: "Scan pickup", phase: "scan-pickup" },
                { n: 3, label: "Scan & confirm", phase: "scan-placement" },
              ].map((s, i) => {
                const phases = ["location", "scan-pickup", "scan-placement"];
                const idx = phases.indexOf(movePhase);
                const done = i < idx;
                const active = movePhase === s.phase;
                return (
                  <div key={s.n} className="flex items-center gap-1 flex-1">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                      done ? "bg-green-500 text-white" : active ? "bg-vault-500 text-white" : "bg-gray-200 text-gray-500"
                    }`}>{done ? "✓" : s.n}</span>
                    <span className={active ? "text-gray-900" : "text-gray-400"}>{s.label}</span>
                    {i < 2 && <div className="flex-1 h-px bg-gray-200 mx-1" />}
                  </div>
                );
              })}
            </div>

            <div className="p-5 space-y-4">

              {/* Phase 1: Pick destination */}
              {movePhase === "location" && (
                <>
                  <p className="text-sm text-gray-600">Where is this item going?</p>
                  <Select value={moveToLocationId} onValueChange={setMoveToLocationId}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Choose destination location…" />
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
                  <Button
                    className="w-full"
                    disabled={!moveToLocationId}
                    onClick={() => { setManualInput(""); setShowCamera(false); setMovePhase("scan-pickup"); }}
                  >
                    Next — Scan Item at Pickup
                  </Button>
                </>
              )}

              {/* Phase 2: Scan at current location */}
              {movePhase === "scan-pickup" && (
                <>
                  <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                    <p className="font-medium">Step 2 of 3 — Pick up item</p>
                    <p className="text-xs mt-0.5">Go to the current location, grab the item, then scan its barcode.</p>
                  </div>

                  {/* Movement trail: from → to */}
                  <div className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-200">
                    <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <code className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono text-gray-700 truncate max-w-[90px]">
                      {currentLocation?.label ?? "Unassigned"}
                    </code>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <code className="bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-mono text-blue-700 truncate max-w-[90px]">
                      {targetLocation?.label ?? "Unassigned"}
                    </code>
                  </div>

                  {showCamera ? (
                    <BarcodeScanner
                      containerId="move-pickup-scanner"
                      onScan={handlePickupScan}
                      onClose={() => setShowCamera(false)}
                    />
                  ) : (
                    <Button variant="outline" className="w-full" onClick={() => setShowCamera(true)}>
                      <ScanLine className="mr-2 h-4 w-4" />
                      Open Camera to Scan
                    </Button>
                  )}

                  <div className="flex gap-2">
                    <Input
                      className="flex-1 font-mono text-sm"
                      placeholder="Or type barcode manually…"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && manualInput.trim() && handlePickupScan(manualInput.trim())}
                    />
                    <Button
                      variant="outline"
                      disabled={!manualInput.trim()}
                      onClick={() => handlePickupScan(manualInput.trim())}
                    >
                      OK
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full text-gray-400" onClick={() => setMovePhase("location")}>
                    ← Back
                  </Button>
                </>
              )}

              {/* Phase 3: Move item, then scan at destination */}
              {movePhase === "scan-placement" && (
                <>
                  <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 flex gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Step 3 of 3 — Place & confirm</p>
                      <p className="text-xs mt-0.5">Bring item to <strong>{targetLocation?.label ?? "the destination"}</strong>, then scan to record placement.</p>
                    </div>
                  </div>

                  {/* Movement trail: from → to */}
                  <div className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-200">
                    <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <code className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono text-gray-700 truncate max-w-[90px]">
                      {currentLocation?.label ?? "Unassigned"}
                    </code>
                    <ArrowRight className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    <code className="bg-green-50 border border-green-300 px-1.5 py-0.5 rounded font-mono text-green-700 truncate max-w-[90px]">
                      {targetLocation?.label ?? "Unassigned"}
                    </code>
                  </div>

                  {showCamera ? (
                    <BarcodeScanner
                      containerId="move-placement-scanner"
                      onScan={handlePlacementScan}
                      onClose={() => setShowCamera(false)}
                    />
                  ) : (
                    <Button variant="outline" className="w-full" onClick={() => setShowCamera(true)}>
                      <ScanLine className="mr-2 h-4 w-4" />
                      Scan to Confirm Placement
                    </Button>
                  )}

                  <div className="flex gap-2">
                    <Input
                      className="flex-1 font-mono text-sm"
                      placeholder="Or type barcode manually…"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && manualInput.trim() && handlePlacementScan(manualInput.trim())}
                    />
                    <Button
                      variant="outline"
                      disabled={!manualInput.trim() || loading}
                      onClick={() => handlePlacementScan(manualInput.trim())}
                    >
                      {loading ? "…" : "OK"}
                    </Button>
                  </div>

                  {/* Manual override — skip scan */}
                  <button
                    className="w-full text-xs text-gray-400 hover:text-gray-600 underline"
                    disabled={loading}
                    onClick={() => handlePlacementScan(itemBarcode)}
                  >
                    Skip scan — confirm placement manually
                  </button>
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="flex flex-wrap gap-2">
        {canDeliver && (
          <Button variant="outline" size="sm" onClick={() => setShowDeliverModal(true)}
            className="text-amber-600 border-amber-200 hover:bg-amber-50">
            <Truck className="mr-2 h-4 w-4" />Stage for Delivery
          </Button>
        )}
        {canMarkDelivered && (
          <Button variant="outline" size="sm" onClick={handleMarkDelivered} disabled={loading}
            className="text-green-600 border-green-200 hover:bg-green-50">
            <CheckCircle className="mr-2 h-4 w-4" />Mark Delivered
          </Button>
        )}
        {canReturn && (
          <Button variant="outline" size="sm" onClick={handleReturn} disabled={loading}
            className="text-blue-600 border-blue-200 hover:bg-blue-50">
            <RotateCcw className="mr-2 h-4 w-4" />Return to Warehouse
          </Button>
        )}
        {canMove && (
          <Button variant="outline" size="sm" onClick={openMoveModal}>
            <MoveRight className="mr-2 h-4 w-4" />Move
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handlePrintLabel}>
          <Printer className="mr-2 h-4 w-4" />Print Label
        </Button>
      </div>
    </>
  );
}
