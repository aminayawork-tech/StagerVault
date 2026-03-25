import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BarChart3, TrendingUp, Package, Users, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatItemStatus, getStatusColor } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("warehouse_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "client") redirect("/dashboard/client");

  const wid = profile.warehouse_id;

  // Start of this month and last month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

  const [
    { count: totalItems },
    { count: itemsInStorage },
    { count: totalClients },
    { count: completedRequests },
    { count: itemsThisMonth },
    { count: itemsLastMonth },
    { data: invoiceSummary },
    { data: itemsByStatus },
    { data: itemsByClient },
    { data: locations },
  ] = await Promise.all([
    supabase.from("items").select("id", { count: "exact", head: true }).eq("warehouse_id", wid).neq("status", "disposed"),
    supabase.from("items").select("id", { count: "exact", head: true }).eq("warehouse_id", wid).in("status", ["stored", "assembled", "received"]),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("warehouse_id", wid).eq("is_active", true),
    supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("warehouse_id", wid).eq("status", "completed"),
    supabase.from("items").select("id", { count: "exact", head: true }).eq("warehouse_id", wid).gte("created_at", startOfMonth),
    supabase.from("items").select("id", { count: "exact", head: true }).eq("warehouse_id", wid).gte("created_at", startOfLastMonth).lte("created_at", endOfLastMonth),
    supabase.from("invoices").select("status, total").eq("warehouse_id", wid),
    supabase.from("items").select("status").eq("warehouse_id", wid).neq("status", "disposed"),
    supabase.from("items").select("client_id, client:clients(name)").eq("warehouse_id", wid).neq("status", "disposed").not("client_id", "is", null),
    supabase.from("locations").select("id, label, zone, capacity, current_count").eq("warehouse_id", wid).order("zone").order("label"),
  ]);

  const totalRevenue = invoiceSummary?.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + (i.total ?? 0), 0) ?? 0;
  const outstanding = invoiceSummary?.filter((i: any) => ["sent", "overdue"].includes(i.status)).reduce((s: number, i: any) => s + (i.total ?? 0), 0) ?? 0;

  // Status counts
  const statusCounts: Record<string, number> = {};
  itemsByStatus?.forEach((item: any) => {
    statusCounts[item.status] = (statusCounts[item.status] ?? 0) + 1;
  });
  const totalForStatus = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  // Per-client counts
  const clientCounts: Record<string, { name: string; count: number }> = {};
  itemsByClient?.forEach((item: any) => {
    const cid = item.client_id;
    const name = item.client?.name ?? "Unknown";
    if (!clientCounts[cid]) clientCounts[cid] = { name, count: 0 };
    clientCounts[cid].count++;
  });
  const clientRows = Object.values(clientCounts).sort((a, b) => b.count - a.count);

  // Storage utilization
  const atCapacity = locations?.filter((l: any) => l.capacity != null && l.current_count >= l.capacity) ?? [];
  const nearCapacity = locations?.filter((l: any) => l.capacity != null && l.current_count / l.capacity >= 0.8 && l.current_count < l.capacity) ?? [];

  const thisMonthChange = (itemsThisMonth ?? 0) - (itemsLastMonth ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Warehouse overview and metrics</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Items", value: totalItems ?? 0, color: "text-blue-600", icon: Package },
          { label: "In Warehouse", value: itemsInStorage ?? 0, color: "text-green-600", icon: Package },
          { label: "Active Clients", value: totalClients ?? 0, color: "text-purple-600", icon: Users },
          { label: "Completed Jobs", value: completedRequests ?? 0, color: "text-amber-600", icon: BarChart3 },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Intake this month */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Items Received This Month</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{itemsThisMonth ?? 0}</p>
          </div>
          <div className={`flex items-center gap-1.5 text-sm font-medium ${thisMonthChange >= 0 ? "text-green-600" : "text-red-500"}`}>
            <TrendingUp className="h-4 w-4" />
            {thisMonthChange >= 0 ? "+" : ""}{thisMonthChange} vs last month
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Revenue Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Collected</span>
              <span className="font-semibold text-green-600">{formatCurrency(totalRevenue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Outstanding</span>
              <span className="font-semibold text-amber-600">{formatCurrency(outstanding)}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-3">
              <span className="text-sm font-medium text-gray-900">Total Invoiced</span>
              <span className="font-bold">{formatCurrency(totalRevenue + outstanding)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Items by status with bars */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Items by Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {totalForStatus === 0 ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <BarChart3 className="h-8 w-8" />
              </div>
            ) : (
              Object.entries(statusCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => (
                  <div key={status} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 capitalize">{status.replace(/_/g, " ")}</span>
                      <span className="font-medium text-gray-900">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-vault-500 rounded-full"
                        style={{ width: `${Math.round((count / totalForStatus) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>

        {/* Per-client breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Items by Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {clientRows.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No items</p>
            ) : (
              clientRows.map((c) => (
                <div key={c.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700 font-medium truncate">{c.name}</span>
                    <span className="text-gray-500 shrink-0 ml-2">{c.count} items</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-400 rounded-full"
                      style={{ width: `${Math.round((c.count / (totalItems ?? 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Storage utilization */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Storage Utilization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!locations?.length ? (
              <p className="text-sm text-gray-400 text-center py-4">No locations set up</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xl font-bold text-gray-900">{locations.length}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Total</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3">
                    <p className="text-xl font-bold text-amber-600">{nearCapacity.length}</p>
                    <p className="text-xs text-amber-600 mt-0.5">Near full</p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3">
                    <p className="text-xl font-bold text-red-600">{atCapacity.length}</p>
                    <p className="text-xs text-red-600 mt-0.5">At capacity</p>
                  </div>
                </div>
                {locations
                  .filter((l: any) => l.capacity != null)
                  .sort((a: any, b: any) => (b.current_count / b.capacity) - (a.current_count / a.capacity))
                  .slice(0, 6)
                  .map((loc: any) => {
                    const pct = Math.min(100, Math.round((loc.current_count / loc.capacity) * 100));
                    const barColor = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-400" : "bg-green-400";
                    return (
                      <div key={loc.id} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <code className="text-gray-600">{loc.label}</code>
                          <span className="text-gray-500">{loc.current_count}/{loc.capacity}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
