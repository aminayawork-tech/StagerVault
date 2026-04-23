"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  ScanLine,
  X,
  Loader2,
  Camera,
  CheckCircle2,
  RefreshCw,
  Printer,
} from "lucide-react";

function generateSKU() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SV-${date}-${rand}`;
}
import { createItemSchema, type CreateItemInput } from "@/lib/validations/item";
import { createItem, uploadItemPhotos } from "@/lib/actions/items";
import { compressImage } from "@/lib/utils/compress-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { BarcodeScanner } from "@/components/items/barcode-scanner";

interface ReceiveItemFormProps {
  clients: { id: string; name: string }[];
  locations: {
    id: string;
    label: string;
    zone: string;
    current_count: number;
    capacity: number | null;
  }[];
  initialBarcode?: string;
}

const ITEM_CATEGORIES = [
  "sofa", "chair", "table", "bed", "dresser", "bookshelf",
  "lamp", "mirror", "art", "rug", "textiles", "decor",
  "media", "storage", "lighting", "other",
];

const COLOR_OPTIONS = [
  "White", "Off-White / Cream", "Beige / Tan", "Gray", "Charcoal", "Black",
  "Brown / Walnut", "Oak / Natural", "Blue / Navy", "Green", "Red / Burgundy",
  "Yellow / Gold", "Orange", "Pink / Blush", "Purple", "Multi / Pattern", "Other",
];

interface CreatedItem {
  id: string;
  name: string;
  barcode: string;
  description?: string;
}

export function ReceiveItemForm({ clients, locations, initialBarcode }: ReceiveItemFormProps) {
  const router = useRouter();
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdItem, setCreatedItem] = useState<CreatedItem | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string>("");
  const [verifyBarcode, setVerifyBarcode] = useState("");
  const [verified, setVerified] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateItemInput>({
    resolver: zodResolver(createItemSchema),
    defaultValues: { quantity: 1, condition: "unknown", barcode: initialBarcode ?? generateSKU() },
  });

  // Regenerate SKU helper
  function regenerateSKU() {
    const sku = generateSKU();
    setValue("barcode", sku);
    toast.success(`New SKU: ${sku}`);
  }

  // ── Drag & drop photos ────────────────────────────────────────────────────
  const onDrop = useCallback(async (accepted: File[]) => {
    const compressed = await Promise.all(accepted.map((f) => compressImage(f)));
    const newFiles = [...photoFiles, ...compressed].slice(0, 10);
    setPhotoFiles(newFiles);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setPhotoPreviews(newPreviews);
  }, [photoFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".heic"] },
    maxSize: 10 * 1024 * 1024,
  });

  function removePhoto(index: number) {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }

  // ── Barcode scan callback ─────────────────────────────────────────────────
  function handleBarcodeScan(code: string) {
    setValue("barcode", code);
    setShowScanner(false);
    toast.success(`Barcode scanned: ${code}`);
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function onSubmit(values: CreateItemInput) {
    setIsSubmitting(true);
    const colorLabel = primaryColor && primaryColor !== "Other" ? primaryColor : null;
    if (colorLabel) {
      values = { ...values, description: `Color: ${colorLabel}${values.description ? `\n${values.description}` : ""}` };
    }
    try {
      const result = await createItem(values);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      // Upload photos if any
      if (photoFiles.length > 0) {
        const fd = new FormData();
        photoFiles.forEach((f) => fd.append("photos", f));
        const photoResult = await uploadItemPhotos(result.data.id, fd);
        if (!photoResult.success) {
          toast.warning("Item saved but some photos failed to upload.");
        }
      }

      toast.success(`"${values.name}" checked in successfully!`);
      setCreatedItem({
        id: result.data.id,
        name: values.name,
        barcode: result.data.barcode ?? values.barcode ?? "",
        description: values.description,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePrintLabel() {
    if (!createdItem) return;
    const win = window.open("", "_blank", "width=400,height=300");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Item Label</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 16px; }
            .label { border: 2px solid #000; padding: 12px; width: 320px; }
            .barcode { font-family: monospace; font-size: 28px; letter-spacing: 4px; margin: 8px 0; }
            .sku { font-size: 11px; color: #555; margin-bottom: 4px; }
            .name { font-size: 15px; font-weight: bold; margin: 4px 0; }
            .desc { font-size: 12px; color: #333; margin-top: 4px; white-space: pre-wrap; }
            .brand { font-size: 10px; color: #888; margin-top: 8px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="label">
            <p class="sku">SKU: ${createdItem.barcode}</p>
            <p class="barcode">|||||||||||</p>
            <p class="name">${createdItem.name}</p>
            ${createdItem.description ? `<p class="desc">${createdItem.description}</p>` : ""}
            <p class="brand">StagerVault · ${new Date().toLocaleDateString()}</p>
          </div>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  }

  function handleVerify() {
    if (!createdItem) return;
    const input = verifyBarcode.trim();
    if (input === createdItem.barcode) {
      setVerified(true);
      toast.success("Barcode verified! Item is registered.");
    } else {
      toast.error(`Barcode mismatch. Expected: ${createdItem.barcode}`);
    }
  }

  function handleNextItem() {
    reset({ quantity: 1, condition: "unknown", barcode: generateSKU() });
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setPrimaryColor("");
    setCreatedItem(null);
    setVerifyBarcode("");
    setVerified(false);
  }

  if (createdItem) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-10 gap-5 px-6">
          <CheckCircle2 className="h-14 w-14 text-green-500" />
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">Item Received!</p>
            <p className="text-sm text-gray-500 mt-1">{createdItem.name}</p>
            <p className="text-xs text-gray-400 font-mono mt-0.5">SKU: {createdItem.barcode}</p>
          </div>

          {/* Step 1: Print Label */}
          <div className="w-full space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Step 1 — Print & attach label</p>
            <Button type="button" onClick={handlePrintLabel} className="w-full" variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Print Label
            </Button>
          </div>

          {/* Step 2: Scan to verify */}
          <div className="w-full space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Step 2 — Scan label to verify</p>
            {verified ? (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg px-3 py-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Barcode verified!</span>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Scan or type barcode…"
                  value={verifyBarcode}
                  onChange={(e) => setVerifyBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleVerify())}
                  className="flex-1 font-mono"
                />
                <Button type="button" onClick={handleVerify} variant="outline" size="icon">
                  <ScanLine className="h-4 w-4" />
                </Button>
              </div>
            )}
            <p className="text-xs text-gray-400">Scan the attached label to confirm registration in receiving area.</p>
          </div>

          <Button type="button" onClick={handleNextItem} className="w-full mt-2">
            <RefreshCw className="mr-2 h-4 w-4" />
            Receive Next Item
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Barcode */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="barcode">SKU / Barcode</Label>
              <Input
                id="barcode"
                placeholder="Auto-generated SKU"
                {...register("barcode")}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="mt-6 shrink-0"
              onClick={regenerateSKU}
              title="Generate new SKU"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="mt-6 shrink-0"
              onClick={() => setShowScanner((v) => !v)}
              title="Scan barcode"
            >
              <ScanLine className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-xs text-gray-400">Auto-generated SKU format: SV-YYYYMMDD-XXXX. Scan or type to override.</p>

          {showScanner && (
            <BarcodeScanner
              onScan={handleBarcodeScan}
              onClose={() => setShowScanner(false)}
            />
          )}
        </CardContent>
      </Card>

      {/* Core fields */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Client */}
            <div className="space-y-1.5">
              <Label>Client *</Label>
              <Select
                onValueChange={(v) => setValue("client_id", v)}
                value={watch("client_id")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.client_id && (
                <p className="text-xs text-red-500">{errors.client_id.message}</p>
              )}
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <Label>Storage Location</Label>
              <Select
                onValueChange={(v) => setValue("location_id", v)}
                value={watch("location_id") ?? undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assign location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem
                      key={loc.id}
                      value={loc.id}
                      disabled={
                        loc.capacity != null &&
                        loc.current_count >= loc.capacity
                      }
                    >
                      {loc.label}
                      {loc.capacity != null && (
                        <span className="ml-2 text-xs text-gray-400">
                          ({loc.current_count}/{loc.capacity})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Item name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              placeholder="e.g. West Elm Hamilton Sofa – Oatmeal"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                onValueChange={(v) => setValue("category", v)}
                value={watch("category") ?? undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Condition */}
            <div className="space-y-1.5">
              <Label>Condition *</Label>
              <Select
                onValueChange={(v) =>
                  setValue("condition", v as CreateItemInput["condition"])
                }
                value={watch("condition")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Condition" />
                </SelectTrigger>
                <SelectContent>
                  {(["excellent", "good", "fair", "damaged", "unknown"] as const).map(
                    (c) => (
                      <SelectItem key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-1.5 w-32">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              defaultValue={1}
              {...register("quantity")}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brand, material, notable features…"
              rows={2}
              {...register("description")}
            />
          </div>

          {/* Primary Color */}
          <div className="space-y-1.5">
            <Label>Primary Color</Label>
            <Select
              onValueChange={(v) => setPrimaryColor(v)}
              value={primaryColor}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select color (optional)" />
              </SelectTrigger>
              <SelectContent>
                {COLOR_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {primaryColor === "Other" && (
              <Input
                placeholder="Enter color…"
                onChange={(e) => setPrimaryColor(e.target.value || "Other")}
                className="mt-2"
              />
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Intake Notes</Label>
            <Textarea
              id="notes"
              placeholder="Condition details, damage observed, special handling instructions…"
              rows={2}
              {...register("notes")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dimensions (collapsible optional) */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900 select-none">
          + Dimensions & pricing (optional)
        </summary>
        <Card className="mt-3">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {(
                [
                  { field: "width_in", label: "Width (in)" },
                  { field: "height_in", label: "Height (in)" },
                  { field: "depth_in", label: "Depth (in)" },
                  { field: "weight_lbs", label: "Weight (lbs)" },
                ] as const
              ).map(({ field, label }) => (
                <div key={field} className="space-y-1.5">
                  <Label htmlFor={field}>{label}</Label>
                  <Input
                    id={field}
                    type="number"
                    step="0.5"
                    placeholder="—"
                    {...register(field)}
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1.5 w-40">
              <Label htmlFor="purchase_price">Purchase Price ($)</Label>
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("purchase_price")}
              />
            </div>
          </CardContent>
        </Card>
      </details>

      {/* Photo upload */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label>Photos ({photoFiles.length}/10)</Label>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-vault-400 bg-vault-50"
                : "border-gray-200 hover:border-vault-300"
            }`}
          >
            <input {...getInputProps()} />
            <Camera className="mx-auto h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">
              {isDragActive
                ? "Drop photos here…"
                : "Drag photos here, or tap to take/select"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              JPEG, PNG, WEBP, HEIC · Max 10MB each · Up to 10 photos
            </p>
          </div>

          {photoPreviews.length > 0 && (
            <div className="photo-grid">
              {photoPreviews.map((url, i) => (
                <div key={url} className="relative aspect-square rounded-lg overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 text-[10px] bg-vault-500 text-white px-1.5 py-0.5 rounded">
                      Primary
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation errors summary */}
      {Object.keys(errors).length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          Please fix the following: {Object.values(errors).map((e) => e?.message).filter(Boolean).join(", ")}
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-3 pb-safe-bottom">
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Check In Item
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/staff")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
