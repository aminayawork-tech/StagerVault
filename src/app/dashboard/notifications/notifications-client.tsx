"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, CheckCheck, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notifications";
import { formatRelative } from "@/lib/utils/format";

interface Notification {
  id: string;
  title: string;
  body: string | null;
  type: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

function getNotificationLink(n: Notification): string | null {
  if (!n.reference_id) return null;
  if (n.type === "invoice_sent") return `/dashboard/client/invoices/${n.reference_id}`;
  if (n.type === "service_update") return `/dashboard/client/service-requests/${n.reference_id}`;
  if (n.type === "item_received") return `/dashboard/client/items/${n.reference_id}`;
  return null;
}

export function NotificationsClient({ notifications }: { notifications: Notification[] }) {
  const router = useRouter();
  const [markingAll, setMarkingAll] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(
    new Set(notifications.filter((n) => n.is_read).map((n) => n.id))
  );

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  async function handleMarkRead(id: string) {
    if (readIds.has(id)) return;
    setReadIds((prev) => new Set([...prev, id]));
    await markNotificationRead(id);
  }

  async function handleMarkAll() {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    const result = await markAllNotificationsRead();
    setMarkingAll(false);
    if (!result.success) { toast.error("Failed to mark all as read"); return; }
    setReadIds(new Set(notifications.map((n) => n.id)));
    toast.success("All notifications marked as read");
    router.refresh();
  }

  if (!notifications.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No notifications yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleMarkAll} disabled={markingAll}>
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Mark all as read
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-gray-100">
            {notifications.map((n) => {
              const isRead = readIds.has(n.id);
              const content = (
                <div
                  className={`flex items-start gap-4 px-6 py-4 transition-colors ${
                    isRead ? "opacity-60" : "bg-blue-50/30"
                  }`}
                >
                  <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${isRead ? "bg-gray-300" : "bg-blue-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    {n.body && <p className="text-sm text-gray-500 mt-0.5">{n.body}</p>}
                    <p className="text-xs text-gray-400 mt-1">{formatRelative(n.created_at)}</p>
                  </div>
                  {!isRead && (
                    <button
                      onClick={(e) => { e.preventDefault(); handleMarkRead(n.id); }}
                      className="text-gray-400 hover:text-blue-500 shrink-0 mt-0.5"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );

              const link = getNotificationLink(n);
              return (
                <li key={n.id} onClick={() => handleMarkRead(n.id)}>
                  {link ? (
                    <Link href={link} className="block hover:bg-gray-50 cursor-pointer">
                      {content}
                    </Link>
                  ) : (
                    <div className="hover:bg-gray-50 cursor-pointer">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
