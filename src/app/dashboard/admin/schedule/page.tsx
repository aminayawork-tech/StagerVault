import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
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

  const { data: scheduled } = await supabase
    .from("service_requests")
    .select("*, client:clients(name)")
    .eq("warehouse_id", profile.warehouse_id)
    .in("status", ["scheduled", "accepted", "in_progress"])
    .order("scheduled_date", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <p className="text-sm text-gray-500 mt-0.5">{scheduled?.length ?? 0} upcoming jobs</p>
      </div>

      {!scheduled?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Nothing scheduled</p>
            <p className="text-sm text-gray-400 mt-1">Accepted and scheduled service requests will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-gray-100">
              {scheduled.map((req: any) => (
                <li key={req.id}>
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
                        {req.scheduled_date ? formatDate(req.scheduled_date) : req.requested_date ? formatDate(req.requested_date) : "TBD"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 capitalize">{req.status.replace(/_/g, " ")}</p>
                    </div>
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
