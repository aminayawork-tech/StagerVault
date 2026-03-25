import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatServiceStatus, getServiceStatusColor } from "@/lib/utils/format";

export const metadata: Metadata = { title: "My Service Requests" };

const SERVICE_TYPE_LABELS: Record<string, string> = {
  delivery: "Delivery",
  pickup: "Pickup",
  assembly: "Assembly",
  disassembly: "Disassembly",
  staging: "Staging",
  restaging: "Restaging",
  other: "Other",
};

export default async function ClientServiceRequestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client" || !profile.client_id) redirect("/");

  const { data: requests } = await supabase
    .from("service_requests")
    .select("id, title, service_type, status, requested_date, scheduled_date, notes, created_at")
    .eq("client_id", profile.client_id)
    .order("created_at", { ascending: false });

  const active = requests?.filter((r) =>
    !["completed", "cancelled"].includes(r.status)
  ) ?? [];
  const past = requests?.filter((r) =>
    ["completed", "cancelled"].includes(r.status)
  ) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Service Requests</h1>
          <p className="text-sm text-gray-500">{requests?.length ?? 0} total requests</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/client/service-requests/new">
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Link>
        </Button>
      </div>

      {!requests?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No service requests yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Contact your warehouse to request a delivery, pickup, or other service.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Active</h2>
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y divide-gray-100">
                    {active.map((req: any) => (
                      <RequestRow key={req.id} req={req} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Past</h2>
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y divide-gray-100">
                    {past.map((req: any) => (
                      <RequestRow key={req.id} req={req} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RequestRow({ req }: { req: any }) {
  return (
    <li className="flex items-start gap-4 px-6 py-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{req.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {SERVICE_TYPE_LABELS[req.service_type] ?? req.service_type}
          {req.scheduled_date && ` · Scheduled ${formatDate(req.scheduled_date)}`}
          {!req.scheduled_date && req.requested_date && ` · Requested ${formatDate(req.requested_date)}`}
        </p>
        {req.notes && (
          <p className="text-xs text-gray-400 mt-1 truncate">{req.notes}</p>
        )}
      </div>
      <span
        className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 mt-0.5 ${getServiceStatusColor(req.status)}`}
      >
        {formatServiceStatus(req.status)}
      </span>
    </li>
  );
}
