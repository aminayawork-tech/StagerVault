import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceRequestActions } from "@/components/service-requests/service-request-actions";
import { formatDate, formatServiceStatus, getServiceStatusColor } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Service Request" };

const SERVICE_TYPE_LABELS: Record<string, string> = {
  delivery: "Delivery", pickup: "Pickup", assembly: "Assembly",
  disassembly: "Disassembly", staging: "Staging", restaging: "Restaging", other: "Other",
};

export default async function ServiceRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("warehouse_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "staff"].includes(profile.role)) redirect("/");

  const [{ data: sr }, { data: srItems }] = await Promise.all([
    supabase
      .from("service_requests")
      .select("*, client:clients(id, name, email), requester:profiles!requested_by(full_name)")
      .eq("id", id)
      .eq("warehouse_id", profile.warehouse_id)
      .single(),

    supabase
      .from("service_request_items")
      .select("item:items(id, name, status, barcode)")
      .eq("service_request_id", id),
  ]);

  if (!sr) notFound();

  const isAdmin = profile.role === "admin";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/admin/service-requests">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{sr.title}</h1>
          <p className="text-sm text-gray-500">
            {(sr.client as any)?.name} · {SERVICE_TYPE_LABELS[sr.service_type] ?? sr.service_type}
          </p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${getServiceStatusColor(sr.status)}`}>
          {formatServiceStatus(sr.status)}
        </span>
      </div>

      {/* Actions */}
      {isAdmin && (
        <ServiceRequestActions srId={id} currentStatus={sr.status} />
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Type">{SERVICE_TYPE_LABELS[sr.service_type] ?? sr.service_type}</Row>
            <Row label="Client">{(sr.client as any)?.name ?? "—"}</Row>
            <Row label="Requested by">{(sr.requester as any)?.full_name ?? "—"}</Row>
            {sr.requested_date && <Row label="Requested Date">{formatDate(sr.requested_date)}</Row>}
            {sr.scheduled_date && <Row label="Scheduled Date">{formatDate(sr.scheduled_date)}</Row>}
            {sr.completed_date && <Row label="Completed">{formatDate(sr.completed_date)}</Row>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {sr.notes ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{sr.notes}</p>
            ) : (
              <p className="text-sm text-gray-400">No notes</p>
            )}
            {sr.admin_notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Internal Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{sr.admin_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Linked items */}
      {srItems && srItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Linked Items ({srItems.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-gray-50">
              {srItems.map((si: any) => (
                <li key={si.item?.id}>
                  <Link
                    href={`/dashboard/admin/items/${si.item?.id}`}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <ClipboardList className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{si.item?.name}</p>
                      {si.item?.barcode && (
                        <p className="text-xs text-gray-400 font-mono">{si.item.barcode}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 capitalize">
                      {si.item?.status?.replace(/_/g, " ")}
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-900 text-right">{children}</span>
    </div>
  );
}
