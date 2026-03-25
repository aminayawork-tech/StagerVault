import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";

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

  const [
    { count: totalItems },
    { count: itemsInStorage },
    { count: totalClients },
    { count: completedRequests },
    { data: invoiceSummary },
    { data: itemsByStatus },
  ] = await Promise.all([
    supabase.from("items").select("id", { count: "exact", head: true }).eq("warehouse_id", wid),
    supabase.from("items").select("id", { count: "exact", head: true }).eq("warehouse_id", wid).in("status", ["stored", "assembled"]),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("warehouse_id", wid).eq("is_active", true),
    supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("warehouse_id", wid).eq("status", "completed"),
    supabase.from("invoices").select("status, total").eq("warehouse_id", wid),
    supabase.from("items").select("status").eq("warehouse_id", wid),
  ]);

  const totalRevenue = invoiceSummary?.filter((i: any) => i.status === "paid").reduce((sum: number, i: any) => sum + (i.total ?? 0), 0) ?? 0;
  const outstanding = invoiceSummary?.filter((i: any) => ["sent", "overdue"].includes(i.status)).reduce((sum: number, i: any) => sum + (i.total ?? 0), 0) ?? 0;

  const statusCounts: Record<string, number> = {};
  itemsByStatus?.forEach((item: any) => {
    statusCounts[item.status] = (statusCounts[item.status] ?? 0) + 1;
  });

  const stats = [
    { label: "Total Items", value: totalItems ?? 0, color: "text-blue-600" },
    { label: "In Storage", value: itemsInStorage ?? 0, color: "text-green-600" },
    { label: "Active Clients", value: totalClients ?? 0, color: "text-purple-600" },
    { label: "Completed Jobs", value: completedRequests ?? 0, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Warehouse overview and metrics</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Items by Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.keys(statusCounts).length === 0 ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <BarChart3 className="h-8 w-8" />
              </div>
            ) : (
              Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 capitalize">{status.replace(/_/g, " ")}</span>
                  <span className="font-medium text-gray-900">{count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
