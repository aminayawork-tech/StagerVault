import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, warehouse:warehouses(name)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/auth/login");

  // Count unread notifications
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .eq("is_read", false);

  const warehouseName =
    (profile.warehouse as unknown as { name: string } | null)?.name ?? "StagerVault";

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        role={profile.role}
        warehouseName={warehouseName}
        userName={profile.full_name}
        unreadNotifications={unreadCount ?? 0}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar
          role={profile.role}
          warehouseName={warehouseName}
          userName={profile.full_name}
          unreadNotifications={unreadCount ?? 0}
        />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
