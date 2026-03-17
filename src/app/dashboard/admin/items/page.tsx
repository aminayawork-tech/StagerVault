import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ItemsTable } from "@/components/items/items-table";

export const metadata: Metadata = { title: "Items" };

interface SearchParams {
  status?: string;
  client?: string;
  q?: string;
  page?: string;
}

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
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

  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const pageSize = 25;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("items")
    .select(
      `id, name, barcode, status, condition, quantity, primary_photo_url,
       created_at, received_at,
       client:clients(id, name),
       location:locations(id, label)`,
      { count: "exact" }
    )
    .eq("warehouse_id", profile.warehouse_id)
    .neq("status", "disposed")
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (params.status) query = query.eq("status", params.status);
  if (params.client) query = query.eq("client_id", params.client);
  if (params.q) query = query.ilike("name", `%${params.q}%`);

  const { data: items, count } = await query;

  // Fetch clients for filter dropdown
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("warehouse_id", profile.warehouse_id)
    .eq("is_active", true)
    .order("name");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Items</h1>
          <p className="text-sm text-gray-500">{count ?? 0} items total</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/staff/receive">
            <Plus className="mr-2 h-4 w-4" />
            Receive Item
          </Link>
        </Button>
      </div>

      <ItemsTable
        items={(items as any[]) ?? []}
        clients={clients ?? []}
        total={count ?? 0}
        page={page}
        pageSize={pageSize}
        filters={{
          status: params.status,
          client: params.client,
          q: params.q,
        }}
      />
    </div>
  );
}
