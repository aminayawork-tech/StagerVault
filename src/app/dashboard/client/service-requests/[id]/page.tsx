import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatServiceStatus, getServiceStatusColor } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Service Request" };

const SERVICE_TYPE_LABELS: Record<string, string> = {
  delivery: "Delivery", pickup: "Pickup", assembly: "Assembly",
  disassembly: "Disassembly", staging: "Staging", restaging: "Restaging", other: "Other",
};

export default async function ClientServiceRequestDetailPage({
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
    .select("client_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client" || !profile.client_id) redirect("/");

  const { data: sr } = await supabase
    .from("service_requests")
    .select("*")
    .eq("id", id)
    .eq("client_id", profile.client_id)
    .single();

  if (!sr) notFound();

  const { data: srItems } = await supabase
    .from("service_request_items")
    .select("item:items(id, name, status, barcode)")
    .eq("service_request_id", id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/client/service-requests">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            My Requests
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{sr.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {SERVICE_TYPE_LABELS[sr.service_type] ?? sr.service_type}
          </p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium shrink-0 ${getServiceStatusColor(sr.status)}`}>
          {formatServiceStatus(sr.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {sr.requested_date && (
              <div className="flex justify-between">
                <span className="text-gray-500">Requested Date</span>
                <span>{formatDate(sr.requested_date)}</span>
              </div>
            )}
            {sr.scheduled_date && (
              <div className="flex justify-between">
                <span className="text-gray-500">Scheduled</span>
                <span>{formatDate(sr.scheduled_date)}</span>
              </div>
            )}
            {sr.completed_date && (
              <div className="flex justify-between">
                <span className="text-gray-500">Completed</span>
                <span>{formatDate(sr.completed_date)}</span>
              </div>
            )}
            {sr.delivery_address && (
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 shrink-0">Address</span>
                <span className="text-right">{sr.delivery_address}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Submitted</span>
              <span>{formatDate(sr.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        {(sr.description || sr.notes) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-700 space-y-2">
              {sr.description && <p className="whitespace-pre-wrap">{sr.description}</p>}
              {sr.notes && <p className="whitespace-pre-wrap text-gray-500">{sr.notes}</p>}
            </CardContent>
          </Card>
        )}
      </div>

      {srItems && srItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Items ({srItems.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-gray-100">
              {srItems.map((si: any) => (
                <li key={si.item?.id}>
                  <Link
                    href={`/dashboard/client/items/${si.item?.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                  >
                    <span className="text-sm font-medium text-gray-900">{si.item?.name}</span>
                    <span className="text-xs text-gray-400 capitalize">{si.item?.status}</span>
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
