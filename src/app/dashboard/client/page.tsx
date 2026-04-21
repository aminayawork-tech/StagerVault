import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, ClipboardList, ArrowRight, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatCurrency,
  formatDate,
  formatItemStatus,
  getStatusColor,
  formatServiceStatus,
  getServiceStatusColor,
} from "@/lib/utils/format";

export default async function ClientPortal() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("warehouse_id, role, client_id, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client" || !profile.client_id) redirect("/");

  const clientId = profile.client_id;

  const [
    { data: clientRecord },
    { count: totalItems },
    { count: inStorage },
    { count: staged },
    { data: recentItems },
    { data: activeRequests },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("name, billing_rate_monthly")
      .eq("id", clientId)
      .single(),

    supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .neq("status", "disposed"),

    supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .in("status", ["stored", "assembled"]),

    supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("status", "staged"),

    supabase
      .from("items")
      .select(
        "id, name, status, condition, primary_photo_url, location:locations(label), updated_at"
      )
      .eq("client_id", clientId)
      .neq("status", "disposed")
      .order("updated_at", { ascending: false })
      .limit(6),

    supabase
      .from("service_requests")
      .select("id, title, service_type, status, requested_date, scheduled_date")
      .eq("client_id", clientId)
      .not("status", "in", '("completed","cancelled")')
      .order("created_at", { ascending: false })
      .limit(4),

  ]);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {profile.full_name.split(" ")[0]}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{clientRecord?.name}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total Items",
            value: totalItems ?? 0,
            href: "/dashboard/client/items",
            className: "text-blue-600 bg-blue-50",
          },
          {
            label: "In Storage",
            value: inStorage ?? 0,
            href: "/dashboard/client/items?status=stored",
            className: "text-green-600 bg-green-50",
          },
          {
            label: "Staged",
            value: staged ?? 0,
            href: "/dashboard/client/items?status=staged",
            className: "text-amber-600 bg-amber-50",
          },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className={`inline-block px-2 py-1 rounded-md text-xs font-semibold mb-2 ${stat.className}`}>
                  {stat.label}
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/dashboard/client/service-requests/new">
            <ClipboardList className="mr-2 h-4 w-4" />
            Request a Service
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/client/items">
            <Package className="mr-2 h-4 w-4" />
            View All Items
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent items */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Your Items</CardTitle>
              <Link
                href="/dashboard/client/items"
                className="text-sm text-vault-600 hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!recentItems?.length ? (
              <p className="text-sm text-gray-500 text-center py-8">No items yet</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentItems.map((item: any) => (
                  <Link
                    key={item.id}
                    href={`/dashboard/client/items/${item.id}`}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors"
                  >
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                      {item.primary_photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.primary_photo_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-5 w-5 text-gray-300" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {item.location?.label && (
                          <span className="flex items-center gap-0.5 text-xs text-gray-400">
                            <MapPin className="h-3 w-3" />
                            {item.location.label}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${getStatusColor(item.status)}`}
                    >
                      {formatItemStatus(item.status)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: requests + invoices */}
        <div className="space-y-6">
          {/* Active Service Requests */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Active Requests</CardTitle>
                <Link
                  href="/dashboard/client/service-requests"
                  className="text-sm text-vault-600 hover:underline flex items-center gap-1"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!activeRequests?.length ? (
                <p className="text-sm text-gray-500 text-center py-6">No active requests</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {activeRequests.map((sr: any) => (
                    <li key={sr.id}>
                      <Link
                        href={`/dashboard/client/service-requests/${sr.id}`}
                        className="flex items-start gap-3 px-6 py-3 hover:bg-gray-50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{sr.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {sr.service_type.replace(/_/g, " ")}
                            {sr.scheduled_date &&
                              ` · ${formatDate(sr.scheduled_date)}`}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${getServiceStatusColor(sr.status)}`}
                        >
                          {formatServiceStatus(sr.status)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
