import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatItemStatus, getStatusColor } from "@/lib/utils/format";

export const metadata: Metadata = { title: "My Items" };

export default async function ClientItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client" || !profile.client_id) redirect("/");

  const params = await searchParams;

  let query = supabase
    .from("items")
    .select("id, name, status, condition, quantity, primary_photo_url, received_at, created_at, location:locations(label)")
    .eq("client_id", profile.client_id)
    .neq("status", "disposed")
    .order("created_at", { ascending: false });

  if (params.status) query = query.eq("status", params.status);

  const { data: items } = await query;

  const statusFilters = [
    { label: "All", value: undefined },
    { label: "Received", value: "received" },
    { label: "In Storage", value: "stored" },
    { label: "Staged", value: "staged" },
    { label: "Delivered", value: "delivered" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Items</h1>
        <p className="text-sm text-gray-500">{items?.length ?? 0} items</p>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((f) => (
          <Link
            key={f.label}
            href={f.value ? `/dashboard/client/items?status=${f.value}` : "/dashboard/client/items"}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              params.status === f.value || (!params.status && !f.value)
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {!items?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No items found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(items as any[]).map((item) => (
            <Link key={item.id} href={`/dashboard/client/items/${item.id}`}>
              <Card className="hover:shadow-md transition-shadow overflow-hidden cursor-pointer h-full">
                <div className="aspect-video bg-gray-100 overflow-hidden">
                  {item.primary_photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.primary_photo_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-10 w-10 text-gray-300" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <p className="font-medium text-gray-900 truncate">{item.name}</p>
                  {item.quantity > 1 && (
                    <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(item.status)}`}
                    >
                      {formatItemStatus(item.status)}
                    </span>
                    {item.location?.label && (
                      <span className="text-xs text-gray-400 font-mono">{item.location.label}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
