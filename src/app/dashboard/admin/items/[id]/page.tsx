import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Calendar, Package, Edit } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoGallery } from "@/components/items/photo-gallery";
import { ItemEventHistory } from "@/components/items/item-event-history";
import { ItemActions } from "@/components/items/item-actions";
import {
  formatItemStatus,
  getStatusColor,
  formatCondition,
  getConditionColor,
  formatDate,
  formatDateTime,
  formatCurrency,
} from "@/lib/utils/format";

export const metadata: Metadata = { title: "Item Detail" };

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("warehouse_id, role, client_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/auth/login");

  const [{ data: item }, { data: photos }, { data: events }] = await Promise.all([
    supabase
      .from("items")
      .select(
        `*, client:clients(id, name, email),
         location:locations(id, label, zone, aisle, bay)`
      )
      .eq("id", id)
      .eq("warehouse_id", profile.warehouse_id)
      .single(),

    supabase
      .from("item_photos")
      .select("id, storage_path, caption, created_at")
      .eq("item_id", id)
      .order("created_at", { ascending: true }),

    supabase
      .from("item_events")
      .select(
        `id, event_type, created_at, notes, condition_before, condition_after,
         from_location:locations!item_events_from_location_id_fkey(label),
         to_location:locations!item_events_to_location_id_fkey(label),
         performer:profiles(full_name)`
      )
      .eq("item_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!item) notFound();

  // Clients can only view their own items
  if (profile.role === "client" && item.client_id !== profile.client_id) {
    notFound();
  }

  // Generate signed URLs for photos
  const photoUrls: string[] = [];
  for (const photo of photos ?? []) {
    const { data } = await supabase.storage
      .from("item-photos")
      .createSignedUrl(photo.storage_path, 3600);
    if (data?.signedUrl) photoUrls.push(data.signedUrl);
  }

  const isStaff = ["admin", "staff"].includes(profile.role);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={isStaff ? "/dashboard/admin/items" : "/dashboard/client/items"}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{item.name}</h1>
          <p className="text-sm text-gray-500">
            {(item.client as any)?.name} ·{" "}
            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
              {item.barcode}
            </code>
          </p>
        </div>
        {isStaff && (
          <div className="flex gap-2">
            <ItemActions
              itemId={id}
              itemName={item.name}
              currentStatus={item.status}
            />
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/admin/items/${id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Photo gallery */}
      <PhotoGallery photoUrls={photoUrls} itemName={item.name} />

      {/* Details grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Item info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Item Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Status">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(item.status)}`}
              >
                {formatItemStatus(item.status)}
              </span>
            </Row>
            <Row label="Condition">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${getConditionColor(item.condition)}`}
              >
                {formatCondition(item.condition)}
              </span>
            </Row>
            <Row label="Category">{item.category ?? "—"}</Row>
            <Row label="Quantity">{item.quantity}</Row>
            {item.description && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Description
                </p>
                <p className="text-gray-700">{item.description}</p>
              </div>
            )}
            {item.notes && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Notes
                </p>
                <p className="text-gray-700">{item.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location + dates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Location & Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Location">
              {item.location ? (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                  <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                    {(item.location as any).label}
                  </code>
                </span>
              ) : (
                <span className="text-gray-400">Unassigned</span>
              )}
            </Row>
            <Row label="Received">{formatDate(item.received_at ?? item.created_at)}</Row>
            <Row label="Last Updated">{formatDateTime(item.updated_at)}</Row>
            {item.staged_address && (
              <Row label="Staging Address">
                <span className="text-right text-sm">{item.staged_address}</span>
              </Row>
            )}
            {item.scheduled_pickup_at && (
              <Row label="Pickup Date">
                <span className="text-amber-600 font-medium">
                  {formatDate(item.scheduled_pickup_at)}
                </span>
              </Row>
            )}
            {isStaff && item.purchase_price && (
              <Row label="Purchase Price">{formatCurrency(item.purchase_price)}</Row>
            )}
            {(item.width_in || item.height_in || item.depth_in) && (
              <Row label="Dimensions">
                {[item.width_in, item.height_in, item.depth_in]
                  .filter(Boolean)
                  .map((d) => `${d}"`)
                  .join(" × ")}
              </Row>
            )}
            {item.weight_lbs && <Row label="Weight">{item.weight_lbs} lbs</Row>}
          </CardContent>
        </Card>
      </div>

      {/* Event history */}
      {events && events.length > 0 && (
        <ItemEventHistory events={events as any[]} />
      )}
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-900 text-right">{children}</span>
    </div>
  );
}
