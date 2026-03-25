import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Service Requests" };

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  accepted: "bg-purple-100 text-purple-700",
  scheduled: "bg-amber-100 text-amber-700",
  in_progress: "bg-orange-100 text-orange-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default async function ServiceRequestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("warehouse_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "client") redirect("/dashboard/client");

  const { data: requests } = await supabase
    .from("service_requests")
    .select("*, client:clients(name)")
    .eq("warehouse_id", profile.warehouse_id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">{requests?.length ?? 0} total requests</p>
        </div>
      </div>

      {!requests?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No service requests yet</p>
            <p className="text-sm text-gray-400 mt-1">Clients can submit delivery, pickup, and assembly requests.</p>
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
                        {req.requested_date ? ` · ${formatDate(req.requested_date)}` : ""}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[req.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {req.status.replace(/_/g, " ")}
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
