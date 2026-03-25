import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, ScanLine, ArrowRight, MapPin, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/utils/format";

export default async function StaffDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("warehouse_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "staff"].includes(profile.role)) redirect("/");

  const warehouseId = profile.warehouse_id;

  const [
    { data: pendingIntake },
    { data: todayScheduled },
    { data: recentMoves },
  ] = await Promise.all([
    supabase
      .from("items")
      .select("id, name, client:clients(name), created_at")
      .eq("warehouse_id", warehouseId)
      .eq("status", "pending_intake")
      .order("created_at", { ascending: false })
      .limit(10),

    supabase
      .from("service_requests")
      .select("id, title, service_type, status, scheduled_date, client:clients(name)")
      .eq("warehouse_id", warehouseId)
      .in("status", ["scheduled", "in_progress"])
      .gte("scheduled_date", new Date().toISOString().split("T")[0])
      .lt(
        "scheduled_date",
        new Date(Date.now() + 86400000).toISOString().split("T")[0]
      )
      .order("scheduled_date", { ascending: true })
      .limit(10),

    supabase
      .from("item_events")
      .select(
        "id, event_type, created_at, item:items(name), to_location:locations(label)"
      )
      .eq("warehouse_id", warehouseId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good{" "}
          {new Date().getHours() < 12
            ? "morning"
            : new Date().getHours() < 17
              ? "afternoon"
              : "evening"}
          , {profile.full_name.split(" ")[0]}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Here's what needs your attention today.</p>
      </div>

      {/* Primary scan CTA — big on mobile */}
      <Button asChild className="w-full h-16 text-lg gap-3 bg-vault-500 hover:bg-vault-600 shadow-md">
        <Link href="/dashboard/staff/scan">
          <ScanLine className="h-7 w-7" />
          Scan Item
        </Link>
      </Button>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
          <Link href="/dashboard/staff/receive">
            <Package className="h-6 w-6" />
            <span className="text-xs font-medium">Receive</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
          <Link href="/dashboard/admin/locations">
            <MapPin className="h-6 w-6" />
            <span className="text-xs font-medium">Locations</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
          <Link href="/dashboard/admin/service-requests">
            <Clock className="h-6 w-6" />
            <span className="text-xs font-medium">Requests</span>
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pending Intake */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                Pending Intake
                {pendingIntake && pendingIntake.length > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {pendingIntake.length}
                  </span>
                )}
              </CardTitle>
              <Link
                href="/dashboard/staff/receive"
                className="text-sm text-vault-600 hover:underline flex items-center gap-1"
              >
                Receive <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!pendingIntake?.length ? (
              <p className="text-sm text-gray-500 text-center py-8">No items pending intake</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {pendingIntake.map((item: any) => (
                  <li key={item.id}>
                    <Link
                      href={`/dashboard/staff/receive?item_id=${item.id}`}
                      className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50"
                    >
                      <div className="p-2 bg-amber-50 rounded-lg">
                        <Package className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          {(item.client as any)?.name} · {formatRelative(item.created_at)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Today's Schedule */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Today&apos;s Schedule</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!todayScheduled?.length ? (
              <p className="text-sm text-gray-500 text-center py-8">Nothing scheduled today</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {todayScheduled.map((sr: any) => (
                  <li key={sr.id}>
                    <Link
                      href={`/dashboard/admin/service-requests/${sr.id}`}
                      className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50"
                    >
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{sr.title}</p>
                        <p className="text-xs text-gray-500">
                          {(sr.client as any)?.name} ·{" "}
                          {sr.scheduled_date
                            ? new Date(sr.scheduled_date).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })
                            : "Time TBD"}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium status-${sr.status}`}
                      >
                        {sr.status.replace("_", " ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {recentMoves && recentMoves.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-gray-50">
              {recentMoves.map((event: any) => (
                <li
                  key={event.id}
                  className="flex items-center gap-3 px-6 py-2.5"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-vault-400 shrink-0" />
                  <p className="text-sm text-gray-700 flex-1">
                    <span className="font-medium">{event.item?.name}</span>
                    {" → "}
                    <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                      {event.to_location?.label ?? event.event_type.replace("_", " ")}
                    </span>
                  </p>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatRelative(event.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
