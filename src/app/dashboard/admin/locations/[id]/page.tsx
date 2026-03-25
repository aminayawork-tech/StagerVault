import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Package, ExternalLink } from "lucide-react";

export const metadata: Metadata = { title: "Location Detail" };

const STATUS_COLORS: Record<string, string> = {
  received: "bg-blue-100 text-blue-700",
  stored: "bg-green-100 text-green-700",
  assembled: "bg-purple-100 text-purple-700",
  staged: "bg-yellow-100 text-yellow-700",
  delivered: "bg-gray-100 text-gray-600",
};

export default async function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("warehouse_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "client") redirect("/dashboard/client");

  const { data: location } = await supabase
    .from("locations")
    .select("*")
    .eq("id", id)
    .eq("warehouse_id", profile.warehouse_id)
    .single();

  if (!location) notFound();

  const { data: items } = await supabase
    .from("items")
    .select(`
      id, name, barcode, status, condition, quantity,
      clients(name)
    `)
    .eq("location_id", id)
    .order("name");

  const utilization = location.capacity
    ? Math.round(((items?.length ?? 0) / location.capacity) * 100)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/admin/locations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Locations
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="h-6 w-6 text-orange-500" />
            {location.label}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Zone {location.zone} · Aisle {location.aisle} · Bay {location.bay}
          </p>
          {location.description && (
            <p className="text-sm text-gray-600 mt-1">{location.description}</p>
          )}
        </div>

        <div className="text-right">
          <div className="text-3xl font-bold text-gray-900">
            {items?.length ?? 0}
            {location.capacity && <span className="text-lg text-gray-400">/{location.capacity}</span>}
          </div>
          <div className="text-sm text-gray-500">items stored</div>
        </div>
      </div>

      {/* Utilization bar */}
      {utilization !== null && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Capacity Utilization</span>
              <span className={`text-sm font-semibold ${utilization >= 90 ? "text-red-600" : utilization >= 70 ? "text-yellow-600" : "text-green-600"}`}>
                {utilization}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  utilization >= 90 ? "bg-red-500" : utilization >= 70 ? "bg-yellow-500" : "bg-green-500"
                }`}
                style={{ width: `${Math.min(utilization, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Items at this Location
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!items?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-10 w-10 text-gray-200 mb-3" />
              <p className="text-gray-400">No items currently stored here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={`/dashboard/admin/items/${item.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">{item.name}</span>
                      {item.quantity > 1 && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          ×{item.quantity}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.barcode && (
                        <span className="text-xs text-gray-400 font-mono">{item.barcode}</span>
                      )}
                      {item.barcode && (item as any).clients?.name && (
                        <span className="text-gray-300">·</span>
                      )}
                      {(item as any).clients?.name && (
                        <span className="text-xs text-gray-500">{(item as any).clients.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[item.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {item.status}
                    </span>
                    {item.condition && (
                      <span className="text-xs text-gray-400 capitalize hidden sm:inline">{item.condition}</span>
                    )}
                    <ExternalLink className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
