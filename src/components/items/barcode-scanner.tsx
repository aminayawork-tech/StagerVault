"use client";

import { useEffect, useRef, useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  containerId?: string;
}

export function BarcodeScanner({ onScan, onClose, containerId = "barcode-scanner-container" }: BarcodeScannerProps) {
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);

  useEffect(() => {
    let scanner: any;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.5 },
          (decodedText: string) => {
            scanner.stop().catch(() => {});
            onScan(decodedText);
          },
          () => {}
        );
        setIsStarting(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Camera access denied or unavailable.";
        setError(msg);
        setIsStarting(false);
      }
    }

    startScanner();

    return () => {
      if (scannerRef.current) scannerRef.current.stop().catch(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 bg-black">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-900">
        <p className="text-sm text-white font-medium">Point camera at barcode</p>
        <Button type="button" variant="ghost" size="icon" className="text-gray-300 hover:text-white h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {error ? (
        <div className="flex items-center gap-3 p-4 bg-red-950 text-red-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Scanner unavailable</p>
            <p className="text-xs text-red-300 mt-0.5">{error}</p>
          </div>
        </div>
      ) : (
        <div id={containerId} className="w-full" style={{ minHeight: 200 }} />
      )}

      {isStarting && !error && (
        <p className="text-xs text-gray-400 text-center py-2 bg-gray-900">Starting camera…</p>
      )}
    </div>
  );
}
