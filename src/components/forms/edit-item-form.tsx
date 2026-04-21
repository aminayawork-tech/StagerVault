"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useState, useCallback } from "react";
import { Loader2, Save, Camera, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { updateItemSchema, type UpdateItemInput } from "@/lib/validations/item";
import { updateItem, uploadItemPhotos } from "@/lib/actions/items";
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

const ITEM_CATEGORIES = [
  "sofa", "chair", "table", "bed", "dresser", "bookshelf",
  "lamp", "mirror", "art", "rug", "textiles", "decor",
  "media", "storage", "lighting", "other",
];

interface EditItemFormProps {
  item: any;
  clients: { id: string; name: string }[];
  locations: { id: string; label: string; zone: string; current_count: number; capacity: number | null }[];
}

export function EditItemForm({ item, clients, locations }: EditItemFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateItemInput>({
    resolver: zodResolver(updateItemSchema),
    defaultValues: {
      id: item.id,
      client_id: item.client_id ?? undefined,
      name: item.name ?? "",
      description: item.description ?? "",
      category: item.category ?? undefined,
      condition: item.condition ?? "unknown",
      quantity: item.quantity ?? 1,
      location_id: item.location_id ?? undefined,
      barcode: item.barcode ?? "",
      width_in: item.width_in ?? undefined,
      height_in: item.height_in ?? undefined,
      depth_in: item.depth_in ?? undefined,
      weight_lbs: item.weight_lbs ?? undefined,
      purchase_price: item.purchase_price ?? undefined,
      notes: item.notes ?? "",
      status: item.status ?? undefined,
    },
  });

  const onDrop = useCallback(async (accepted: File[]) => {
    const compressed = await Promise.all(accepted.map((f) => compressImage(f)));
    const newFiles = [...photoFiles, ...compressed].slice(0, 10);
    setPhotoFiles(newFiles);
    setPhotoPreviews(newFiles.map((f) => URL.createObjectURL(f)));
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

  async function onSubmit(values: UpdateItemInput) {
    setSaving(true);
    const result = await updateItem(values);

    if (!result.success) {
      setSaving(false);
      toast.error(result.error ?? "Failed to save changes");
      return;
    }

    // Upload new photos if any
    if (photoFiles.length > 0) {
      const fd = new FormData();
      photoFiles.forEach((f) => fd.append("photos", f));
      const photoResult = await uploadItemPhotos(item.id, fd);
      if (!photoResult.success) {
        toast.warning("Item saved but some photos failed to upload.");
      } else {
        toast.success(`Item updated · ${photoFiles.length} photo${photoFiles.length > 1 ? "s" : ""} uploaded`);
        setSaving(false);
        router.push(`/dashboard/admin/items/${item.id}`);
        return;
      }
    }

    setSaving(false);
    toast.success("Item updated");
    router.push(`/dashboard/admin/items/${item.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <input type="hidden" {...register("id")} />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Client */}
            <div className="space-y-1.5">
              <Label>Client *</Label>
              <Select
                value={watch("client_id")}
                onValueChange={(v) => setValue("client_id", v, { shouldDirty: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.client_id && <p className="text-xs text-red-500">{errors.client_id.message}</p>}
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <Label>Storage Location</Label>
              <Select
                value={watch("location_id") ?? "none"}
                onValueChange={(v) => setValue("location_id", v === "none" ? null : v, { shouldDirty: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem
                      key={loc.id}
                      value={loc.id}
                      disabled={loc.capacity != null && loc.current_count >= loc.capacity && loc.id !== item.location_id}
                    >
                      {loc.label}
                      {loc.capacity != null && (
                        <span className="ml-2 text-xs text-gray-400">({loc.current_count}/{loc.capacity})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Item Name *</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={watch("category") ?? "none"}
                onValueChange={(v) => setValue("category", v === "none" ? undefined : v, { shouldDirty: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
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
                value={watch("condition")}
                onValueChange={(v) => setValue("condition", v as UpdateItemInput["condition"], { shouldDirty: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["excellent", "good", "fair", "damaged", "unknown"] as const).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-1.5 w-32">
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" type="number" min={1} {...register("quantity")} />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={2} {...register("description")} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} {...register("notes")} />
          </div>

          {/* Barcode */}
          <div className="space-y-1.5">
            <Label htmlFor="barcode">Barcode</Label>
            <Input id="barcode" {...register("barcode")} />
          </div>
        </CardContent>
      </Card>

      {/* Photo upload */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label>Add / Replace Photos ({photoFiles.length}/10)</Label>
          {item.primary_photo_url && photoFiles.length === 0 && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.primary_photo_url}
                alt="Current primary"
                className="w-14 h-14 rounded-lg object-cover shrink-0"
              />
              <p className="text-xs text-gray-500">Current primary photo. Upload new photos to add more.</p>
            </div>
          )}

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
              {isDragActive ? "Drop photos here…" : "Drag photos here, or tap to take/select"}
            </p>
            <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WEBP, HEIC · Max 10MB each</p>
          </div>

          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {photoPreviews.map((url, i) => (
                <div key={url} className="relative aspect-square rounded-lg overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
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

      {/* Dimensions */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900 select-none">
          + Dimensions & pricing (optional)
        </summary>
        <Card className="mt-3">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {([
                { field: "width_in", label: "Width (in)" },
                { field: "height_in", label: "Height (in)" },
                { field: "depth_in", label: "Depth (in)" },
                { field: "weight_lbs", label: "Weight (lbs)" },
              ] as const).map(({ field, label }) => (
                <div key={field} className="space-y-1.5">
                  <Label htmlFor={field}>{label}</Label>
                  <Input id={field} type="number" step="0.5" placeholder="—" {...register(field)} />
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1.5 w-40">
              <Label htmlFor="purchase_price">Purchase Price ($)</Label>
              <Input id="purchase_price" type="number" step="0.01" placeholder="0.00" {...register("purchase_price")} />
            </div>
          </CardContent>
        </Card>
      </details>

      <div className="flex gap-3 pb-6">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
          ) : (
            <><Save className="mr-2 h-4 w-4" />Save Changes</>
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(`/dashboard/admin/items/${item.id}`)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
