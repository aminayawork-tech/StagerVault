import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatServiceStatus, getServiceStatusColor } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Service Requests" };

export default async function ServiceRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("warehouse_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "client") redirect("/dashboard/client");

  const params = await searchParams;
  const activeTab = params.status ?? "active";

  let query = supabase
    .from("service_requests")
    .select("id, title, service_type, status, requested_date, scheduled_date, client:clients(name)")
    .eq("warehouse_id", profile.warehouse_id)
    .order("created_at", { ascending: false });

  if (activeTab === "active") {
    query = query.not("status", "in", '("completed","cancelled")');
  } else if (activeTab === "completed") {
    query = query.in("status", ["completed", "cancelled"]);
  }

  const { data: requests } = await query;

  const { count: activeCount } = await supabase
    .from("service_requests")
    .select("id", { count: "exact", head: true })
    .eq("warehouse_id", profile.warehouse_id)
    .not("status", "in", '("completed","cancelled")');

  const tabs = [
    { key: "active", label: `Active${activeCount ? ` (${activeCount})` : ""}` },
    { key: "completed", label: "Past" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
        <p className="text-sm text-gray-500 mt-0.5">{requests?.length ?? 0} requests</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/dashboard/admin/service-requests?status=${tab.key}`}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {!requests?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No requests found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-gray-100">
              {requests.map((req: any) => (
                <li key={req.id}>
                  <Link
                    href={`/dashboard/admin/service-requests/${req.id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{req.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {req.client?.name} · {req.service_type.replace(/_/g, " ")}
                        {req.scheduled_date
                          ? ` · Scheduled ${formatDate(req.scheduled_date)}`
                          : req.requested_date
                          ? ` · Requested ${formatDate(req.requested_date)}`
                          : ""}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${getServiceStatusColor(req.status)}`}
                    >
                      {formatServiceStatus(req.status)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
