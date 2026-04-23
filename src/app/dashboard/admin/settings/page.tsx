import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("warehouse_id, role, full_name, email, phone")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/dashboard/admin");

  const { data: warehouse } = await supabase
    .from("warehouses")
    .select("name, slug, email, phone, address, city, state, zip")
    .eq("id", profile.warehouse_id)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Warehouse configuration</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Warehouse Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Name", value: warehouse?.name },
              { label: "Slug", value: warehouse?.slug },
              { label: "Email", value: warehouse?.email },
              { label: "Phone", value: warehouse?.phone },
              { label: "Address", value: [warehouse?.address, warehouse?.city, warehouse?.state, warehouse?.zip].filter(Boolean).join(", ") || null },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-start gap-4">
                <span className="text-sm text-gray-500 shrink-0">{label}</span>
                <span className="text-sm text-gray-900 text-right">{value || <span className="text-gray-400 italic">Not set</span>}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Name", value: profile.full_name },
              { label: "Email", value: profile.email },
              { label: "Phone", value: profile.phone },
              { label: "Role", value: profile.role },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-start gap-4">
                <span className="text-sm text-gray-500 shrink-0">{label}</span>
                <span className="text-sm text-gray-900 text-right capitalize">{value || <span className="text-gray-400 italic">Not set</span>}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
