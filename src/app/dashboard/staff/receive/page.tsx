import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReceiveItemForm } from "@/components/forms/receive-item-form";

export const metadata: Metadata = { title: "Receive Item" };

export default async function ReceiveItemPage({
  searchParams,
}: {
  searchParams: Promise<{ barcode?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("warehouse_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "staff"].includes(profile.role)) redirect("/");

  const { barcode } = await searchParams;

  // Prefetch clients and locations for the form
  const [{ data: clients }, { data: locations }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name")
      .eq("warehouse_id", profile.warehouse_id)
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("locations")
      .select("id, label, zone, current_count, capacity")
      .eq("warehouse_id", profile.warehouse_id)
      .eq("is_active", true)
      .order("label"),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Receive Item</h1>
        <p className="text-sm text-gray-500 mt-1">
          Scan a barcode or fill in the details to check in a new item.
        </p>
      </div>
      <ReceiveItemForm
        clients={clients ?? []}
        locations={locations ?? []}
        initialBarcode={barcode}
      />
    </div>
  );
}
