import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { EditItemForm } from "@/components/forms/edit-item-form";

export const metadata: Metadata = { title: "Edit Item" };

export default async function EditItemPage({
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

  const [{ data: item }, { data: clients }, { data: locations }] = await Promise.all([
    supabase
      .from("items")
      .select("*")
      .eq("id", id)
      .eq("warehouse_id", profile.warehouse_id)
      .single(),

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
      .order("zone")
      .order("label"),
  ]);

  if (!item) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/admin/items/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Edit Item</h1>
          <p className="text-sm text-gray-500 truncate max-w-xs">{item.name}</p>
        </div>
      </div>

      <EditItemForm
        item={item}
        clients={clients ?? []}
        locations={locations ?? []}
      />
    </div>
  );
}
