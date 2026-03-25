"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ScanLine, X, Package, MapPin, Plus, ArrowRight,
  Loader2, CheckCircle, Truck, RotateCcw, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { lookupByBarcode, type ScanResult } from "@/lib/actions/scan";
import { updateItemStatus, returnToWarehouse } from "@/lib/actions/items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatItemStatus, getStatusColor } from "@/lib/utils/format";
import { DeliverItemModal } from "@/components/items/deliver-item-modal";

type Phase = "scan" | "result" | "not-found";

export function ScanPageClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("scan");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [manualBarcode, setManualBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const scannerRef = useRef<any>(null);
  const containerId = "scan-camera";

  const handleScanResult = useCallback(async (barcode: string) => {
    if (loading) return;
    setScannedBarcode(barcode);
    setLoading(true);
    const result = await lookupByBarcode(barcode.trim());
    setLoading(false);
    setScanResult(result);
    setPhase(result.found ? "result" : "not-found");
  }, [loading]);

  // Start camera scanner
  useEffect(() => {
    if (phase !== "scan") return;
    let scanner: any;

    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 12, qrbox: { width: 280, height: 120 } },
          (decoded: string) => {
            scanner.stop().catch(() => {});
            handleScanResult(decoded);
          },
          () => {}
        );
      } catch {
        // Camera unavailable — user can type manually
      }
    }

    start();
    return () => {
      if (scannerRef.current) scannerRef.current.stop().catch(() => {});
    };
  }, [phase, handleScanResult]);

  function reset() {
    setScanResult(null);
    setScannedBarcode("");
    setManualBarcode("");
    setPhase("scan");
  }

  async function handleMarkDelivered() {
    if (!scanResult?.item) return;
    if (!confirm(`Mark "${scanResult.item.name}" as delivered?`)) return;
    setActionLoading(true);
    const result = await updateItemStatus({ item_id: scanResult.item.id, status: "delivered" });
    setActionLoading(false);
    if (!result.success) { toast.error(result.error ?? "Failed"); return; }
    toast.success("Marked as delivered");
    reset();
  }

  async function handleReturn() {
    if (!scanResult?.item) return;
    setActionLoading(true);
    const result = await returnToWarehouse({ item_id: scanResult.item.id });
    setActionLoading(false);
    if (!result.success) { toast.error(result.error ?? "Failed"); return; }
    toast.success("Returned to warehouse");
    reset();
  }

  const item = scanResult?.item;

  // ── Scan phase ─────────────────────────────────────────────────────────────
  if (phase === "scan") {
    return (
      <div className="flex flex-col min-h-[calc(100vh-56px)] bg-gray-950">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-vault-400" />
            <span className="text-white font-semibold">Scan Item</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Camera */}
        <div className="flex-1 relative flex flex-col items-center justify-center">
          <div id={containerId} className="w-full max-w-sm" style={{ minHeight: 300 }} />

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-vault-500" />
                <p className="text-sm font-medium text-gray-700">Looking up item…</p>
              </div>
            </div>
          )}

          {/* Guide overlay */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div className="w-72 h-24 border-2 border-vault-400 rounded-lg opacity-60" />
            <p className="mt-4 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
              Align barcode within the frame
            </p>
          </div>
        </div>

        {/* Manual entry */}
        <div className="bg-gray-900 px-4 pt-4 pb-safe pb-6 space-y-3">
          <p className="text-xs text-gray-400 text-center">Or enter barcode manually</p>
          <div className="flex gap-2">
            <Input
              className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              placeholder="Type barcode…"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && manualBarcode.trim() && handleScanResult(manualBarcode)}
            />
            <Button
              disabled={!manualBarcode.trim() || loading}
              onClick={() => handleScanResult(manualBarcode)}
              className="shrink-0"
            >
              Search
            </Button>
          </div>

          <Button
            asChild
            variant="outline"
            className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            <Link href="/dashboard/staff/receive">
              <Plus className="mr-2 h-4 w-4" />
              Receive New Item
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // ── Not found phase ─────────────────────────────────────────────────────────
  if (phase === "not-found") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] p-6 gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center">
          <AlertCircle className="h-10 w-10 text-amber-500" />
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">Item Not Found</p>
          <p className="text-sm text-gray-500 mt-1">
            No item matches barcode:
            <code className="block mt-1 text-xs bg-gray-100 px-2 py-1 rounded font-mono">{scannedBarcode}</code>
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button asChild>
            <Link href={`/dashboard/staff/receive?barcode=${encodeURIComponent(scannedBarcode)}`}>
              <Plus className="mr-2 h-4 w-4" />
              Receive as New Item
            </Link>
          </Button>
          <Button variant="outline" onClick={reset}>
            <ScanLine className="mr-2 h-4 w-4" />
            Scan Again
          </Button>
        </div>
      </div>
    );
  }

  // ── Result phase ────────────────────────────────────────────────────────────
  const canDeliver = item && ["received", "stored", "assembled"].includes(item.status);
  const canMarkDelivered = item?.status === "out_for_delivery";
  const canReturn = item?.status === "staged";

  return (
    <>
      {showDeliverModal && item && (
        <DeliverItemModal
          itemId={item.id}
          itemName={item.name}
          onClose={() => { setShowDeliverModal(false); reset(); }}
        />
      )}

      <div className="flex flex-col min-h-[calc(100vh-56px)] bg-white">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
          <span className="text-white font-semibold text-sm">Item Found</span>
          <button onClick={reset} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Photo */}
          {item?.primary_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.primary_photo_url}
              alt={item?.name}
              className="w-full aspect-video object-cover"
            />
          ) : (
            <div className="w-full aspect-video bg-gray-100 flex items-center justify-center">
              <Package className="h-16 w-16 text-gray-300" />
            </div>
          )}

          <div className="p-5 space-y-5">
            {/* Name + status */}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{item?.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${getStatusColor(item?.status as any)}`}>
                  {formatItemStatus(item?.status as any)}
                </span>
                {item?.client && (
                  <span className="text-sm text-gray-500">{item.client.name}</span>
                )}
              </div>
            </div>

            {/* Location / address */}
            <div className="rounded-xl bg-gray-50 p-4 space-y-2">
              {["received", "stored", "assembled"].includes(item?.status ?? "") && item?.location ? (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Warehouse Location</p>
                    <code className="text-sm font-mono font-bold text-gray-800">{item.location.label}</code>
                  </div>
                </div>
              ) : item?.staged_address ? (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Staging Address</p>
                    <p className="text-sm font-medium text-gray-800">{item.staged_address}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No location assigned</p>
              )}
              {item?.quantity && item.quantity > 1 && (
                <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {canDeliver && (
                <Button
                  className="w-full h-12 text-base bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => setShowDeliverModal(true)}
                  disabled={actionLoading}
                >
                  <Truck className="mr-2 h-5 w-5" />
                  Stage for Delivery
                </Button>
              )}
              {canMarkDelivered && (
                <Button
                  className="w-full h-12 text-base bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleMarkDelivered}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                  Mark Delivered
                </Button>
              )}
              {canReturn && (
                <Button
                  className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleReturn}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <RotateCcw className="mr-2 h-5 w-5" />}
                  Return to Warehouse
                </Button>
              )}

              <Button asChild variant="outline" className="w-full h-12 text-base">
                <Link href={`/dashboard/admin/items/${item?.id}`}>
                  View Full Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <Button variant="ghost" className="w-full" onClick={reset}>
                <ScanLine className="mr-2 h-4 w-4" />
                Scan Another
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
