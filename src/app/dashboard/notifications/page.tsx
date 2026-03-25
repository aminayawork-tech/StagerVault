import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelative } from "@/lib/utils/format";
import { NotificationsClient } from "./notifications-client";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, body, is_read, created_at, link")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500">{unreadCount} unread</p>
          )}
        </div>
      </div>

      <NotificationsClient notifications={notifications ?? []} />
    </div>
  );
}
