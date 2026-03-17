import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Package,
  ClipboardList,
  Users,
  FileText,
  TrendingUp,
  AlertCircle,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatRelative } from "@/lib/utils/format";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("warehouse_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/");

  const warehouseId = profile.warehouse_id;

  // ── Parallel queries for dashboard stats ────────────────────────────────────
  const [
    { count: totalItems },
    { count: itemsInStorage },
    { count: pendingRequests },
    { count: activeClients },
    { data: recentItems },
    { data: urgentRequests },
    { data: overdueInvoices },
  ] = await Promise.all([
    supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("warehouse_id", warehouseId)
      .neq("status", "disposed"),

    supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("warehouse_id", warehouseId)
      .in("status", ["stored", "assembled"]),

    supabase
      .from("service_requests")
      .select("id", { count: "exact", head: true })
      .eq("warehouse_id", warehouseId)
      .in("status", ["submitted", "accepted"]),

    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("warehouse_id", warehouseId)
      .eq("is_active", true),

    supabase
      .from("items")
      .select("id, name, status, condition, client:clients(name), created_at, primary_photo_url")
      .eq("warehouse_id", warehouseId)
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("service_requests")
      .select("id, title, service_type, status, requested_date, client:clients(name)")
      .eq("warehouse_id", warehouseId)
      .in("status", ["submitted", "scheduled"])
      .order("requested_date", { ascending: true })
      .limit(5),

    supabase
      .from("invoices")
      .select("id, invoice_number, total, due_date, client:clients(name)")
      .eq("warehouse_id", warehouseId)
      .eq("status", "overdue")
      .order("due_date", { ascending: true })
      .limit(3),
  ]);

  const stats = [
    {
      label: "Total Items",
      value: totalItems ?? 0,
      icon: Package,
      href: "/dashboard/admin/items",
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "In Storage",
      value: itemsInStorage ?? 0,
      icon: Package,
      href: "/dashboard/admin/items?status=stored",
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Pending Requests",
      value: pendingRequests ?? 0,
      icon: ClipboardList,
      href: "/dashboard/admin/service-requests",
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Active Clients",
      value: activeClients ?? 0,
      icon: Users,
      href: "/dashboard/admin/clients",
      color: "text-purple-600 bg-purple-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/admin/items/new">
              <Package className="mr-2 h-4 w-4" />
              Receive Item
            </Link>
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <TrendingUp className="h-4 w-4 text-gray-300" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Items */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recently Received</CardTitle>
              <Link
                href="/dashboard/admin/items"
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
              <ul className="divide-y divide-gray-50">
                {recentItems.map((item: any) => (
                  <li key={item.id}>
                    <Link
                      href={`/dashboard/admin/items/${item.id}`}
                      className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                        {item.primary_photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.primary_photo_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-4 w-4 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {(item.client as any)?.name} · {formatRelative(item.created_at)}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium status-${item.status}`}
                      >
                        {item.status.replace("_", " ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Service Requests */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Upcoming Requests</CardTitle>
              <Link
                href="/dashboard/admin/service-requests"
                className="text-sm text-vault-600 hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!urgentRequests?.length ? (
              <p className="text-sm text-gray-500 text-center py-8">No pending requests</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {urgentRequests.map((sr: any) => (
                  <li key={sr.id}>
                    <Link
                      href={`/dashboard/admin/service-requests/${sr.id}`}
                      className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-amber-50">
                        <Calendar className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{sr.title}</p>
                        <p className="text-xs text-gray-500">
                          {(sr.client as any)?.name} ·{" "}
                          {sr.requested_date ? formatDate(sr.requested_date) : "No date set"}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium status-${sr.status}`}
                      >
                        {sr.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue Invoices Alert */}
      {overdueInvoices && overdueInvoices.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">
                  {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? "s" : ""}
                </p>
                <ul className="mt-1 space-y-1">
                  {overdueInvoices.map((inv: any) => (
                    <li key={inv.id} className="text-sm text-red-700">
                      {inv.invoice_number} — {(inv.client as any)?.name} —{" "}
                      <strong>{formatCurrency(inv.total)}</strong> due{" "}
                      {formatDate(inv.due_date)}
                    </li>
                  ))}
                </ul>
                <Button asChild variant="destructive" size="sm" className="mt-3">
                  <Link href="/dashboard/admin/invoices?status=overdue">
                    <FileText className="mr-2 h-4 w-4" />
                    View Overdue Invoices
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
