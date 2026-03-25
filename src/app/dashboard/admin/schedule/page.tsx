import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, Truck, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Schedule" };

export default async function SchedulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("warehouse_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "client") redirect("/dashboard/client");

  const [{ data: scheduled }, { data: stagedItems }] = await Promise.all([
    supabase
      .from("service_requests")
      .select("id, title, service_type, status, requested_date, scheduled_date, client:clients(name)")
      .eq("warehouse_id", profile.warehouse_id)
      .in("status", ["scheduled", "accepted", "in_progress"])
      .order("scheduled_date", { ascending: true }),

    supabase
      .from("items")
      .select("id, name, staged_address, scheduled_pickup_at, client:clients(name)")
      .eq("warehouse_id", profile.warehouse_id)
      .eq("status", "staged")
      .not("scheduled_pickup_at", "is", null)
      .order("scheduled_pickup_at", { ascending: true }),
  ]);

  // Build a combined timeline sorted by date
  type TimelineEntry =
    | { type: "pickup"; date: string; item: any }
    | { type: "service"; date: string; req: any };

  const timeline: TimelineEntry[] = [
    ...(stagedItems ?? []).map((item) => ({
      type: "pickup" as const,
      date: item.scheduled_pickup_at!,
      item,
    })),
    ...(scheduled ?? []).map((req) => ({
      type: "service" as const,
      date: req.scheduled_date ?? req.requested_date ?? "",
      req,
    })),
  ].sort((a, b) => (a.date < b.date ? -1 : 1));

  const totalCount = timeline.length;

  // Group by date label
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming: TimelineEntry[] = [];
  const overdue: TimelineEntry[] = [];

  for (const entry of timeline) {
    const d = new Date(entry.date);
    d.setHours(0, 0, 0, 0);
    if (entry.type === "pickup" && d < today) {
      overdue.push(entry);
    } else {
      upcoming.push(entry);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <p className="text-sm text-gray-500 mt-0.5">{totalCount} upcoming</p>
      </div>

      {totalCount === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Nothing scheduled</p>
            <p className="text-sm text-gray-400 mt-1">
              Scheduled service requests and staged-item pickups will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {overdue.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wide mb-3">
                Overdue Pickups
              </h2>
              <Card className="border-red-200">
                <CardContent className="p-0">
                  <ul className="divide-y divide-gray-100">
                    {overdue.map((entry, i) =>
                      entry.type === "pickup" ? (
                        <PickupRow key={i} item={entry.item} overdue />
                      ) : null
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Upcoming
              </h2>
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y divide-gray-100">
                    {upcoming.map((entry, i) =>
                      entry.type === "pickup" ? (
                        <PickupRow key={i} item={entry.item} />
                      ) : (
                        <ServiceRow key={i} req={entry.req} />
                      )
                    )}
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

function PickupRow({ item, overdue }: { item: any; overdue?: boolean }) {
  return (
    <li>
      <Link
        href={`/dashboard/admin/items/${item.id}`}
        className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className={`p-2 rounded-lg shrink-0 ${overdue ? "bg-red-50" : "bg-blue-50"}`}>
          <Truck className={`h-4 w-4 ${overdue ? "text-red-500" : "text-blue-500"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {item.client?.name}
            {item.staged_address && ` · ${item.staged_address}`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-sm font-medium ${overdue ? "text-red-600" : "text-gray-900"}`}>
            {formatDate(item.scheduled_pickup_at)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Pickup</p>
        </div>
      </Link>
    </li>
  );
}

function ServiceRow({ req }: { req: any }) {
  return (
    <li>
      <Link
        href={`/dashboard/admin/service-requests/${req.id}`}
        className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="p-2 rounded-lg bg-amber-50 shrink-0">
          <Calendar className="h-4 w-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{req.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {req.client?.name} · {req.service_type.replace(/_/g, " ")}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-medium text-gray-900">
            {req.scheduled_date
              ? formatDate(req.scheduled_date)
              : req.requested_date
              ? formatDate(req.requested_date)
              : "TBD"}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 capitalize">
            {req.status.replace(/_/g, " ")}
          </p>
        </div>
      </Link>
    </li>
  );
}
