import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoGallery } from "@/components/items/photo-gallery";
import { ItemEventHistory } from "@/components/items/item-event-history";
import {
  formatItemStatus,
  getStatusColor,
  formatCondition,
  getConditionColor,
  formatDate,
  formatDateTime,
} from "@/lib/utils/format";

export const metadata: Metadata = { title: "Item Detail" };

export default async function ClientItemDetailPage({
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
    .select("client_id, role, warehouse_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client" || !profile.client_id) redirect("/");

  const [{ data: item }, { data: photos }, { data: events }] = await Promise.all([
    supabase
      .from("items")
      .select(`*, location:locations(id, label, zone, aisle, bay)`)
      .eq("id", id)
      .eq("client_id", profile.client_id)
      .single(),

    supabase
      .from("item_photos")
      .select("id, storage_path, caption, created_at")
      .eq("item_id", id)
      .order("created_at", { ascending: true }),

    supabase
      .from("item_events")
      .select(
        `id, event_type, created_at, notes,
         from_location:locations!item_events_from_location_id_fkey(label),
         to_location:locations!item_events_to_location_id_fkey(label)`
      )
      .eq("item_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!item) notFound();

  // Generate signed URLs for photos
  const photoUrls: string[] = [];
  for (const photo of photos ?? []) {
    const { data } = await supabase.storage
      .from("item-photos")
      .createSignedUrl(photo.storage_path, 3600);
    if (data?.signedUrl) photoUrls.push(data.signedUrl);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/client/items">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{item.name}</h1>
          {item.barcode && (
            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
              {item.barcode}
            </code>
          )}
        </div>
      </div>

      {/* Photo gallery */}
      <PhotoGallery photoUrls={photoUrls} itemName={item.name} />

      {/* Details grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Item Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Status">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(item.status)}`}>
                {formatItemStatus(item.status)}
              </span>
            </Row>
            <Row label="Condition">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getConditionColor(item.condition)}`}>
                {formatCondition(item.condition)}
              </span>
            </Row>
            {item.category && <Row label="Category">{item.category}</Row>}
            <Row label="Quantity">{item.quantity}</Row>
            {item.description && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Description</p>
                <p className="text-gray-700">{item.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

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
                <span className="text-gray-400">In warehouse</span>
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
          </CardContent>
        </Card>
      </div>

      {events && events.length > 0 && (
        <ItemEventHistory events={events as any[]} />
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-900 text-right">{children}</span>
    </div>
  );
}
