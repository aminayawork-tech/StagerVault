"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  MapPin,
  ClipboardList,
  Users,
  Settings,
  Truck,
  Bell,
  ScanLine,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { UserRole } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  badge?: number;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard/admin",
    icon: LayoutDashboard,
    roles: ["admin"],
  },
  {
    label: "Dashboard",
    href: "/dashboard/staff",
    icon: LayoutDashboard,
    roles: ["staff"],
  },
  {
    label: "My Inventory",
    href: "/dashboard/client",
    icon: Package,
    roles: ["client"],
  },
  {
    label: "Items",
    href: "/dashboard/admin/items",
    icon: Package,
    roles: ["admin", "staff"],
  },
  {
    label: "Scan Item",
    href: "/dashboard/staff/scan",
    icon: ScanLine,
    roles: ["staff", "admin"],
  },
  {
    label: "Receive Items",
    href: "/dashboard/staff/receive",
    icon: ScanLine,
    roles: ["staff"],
  },
  {
    label: "Locations",
    href: "/dashboard/admin/locations",
    icon: MapPin,
    roles: ["admin", "staff"],
  },
  {
    label: "Service Requests",
    href: "/dashboard/admin/service-requests",
    icon: ClipboardList,
    roles: ["admin", "staff"],
  },
  {
    label: "My Requests",
    href: "/dashboard/client/service-requests",
    icon: ClipboardList,
    roles: ["client"],
  },
  {
    label: "Schedule",
    href: "/dashboard/admin/schedule",
    icon: Truck,
    roles: ["admin", "staff"],
  },
  {
    label: "Clients",
    href: "/dashboard/admin/clients",
    icon: Users,
    roles: ["admin"],
  },
  {
    label: "Settings",
    href: "/dashboard/admin/settings",
    icon: Settings,
    roles: ["admin"],
  },
];

interface SidebarProps {
  role: UserRole;
  warehouseName: string;
  userName: string;
  unreadNotifications?: number;
  className?: string;
}

export function Sidebar({ role, warehouseName, userName, unreadNotifications = 0, className }: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className={className ?? "hidden lg:flex flex-col w-60 min-h-screen bg-gray-900 text-white shrink-0"}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-800">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-vault-500 shrink-0">
          <span className="text-white text-sm font-bold">SV</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{warehouseName}</p>
          <p className="text-xs text-gray-400 truncate">StagerVault</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard/admin" &&
              item.href !== "/dashboard/staff" &&
              item.href !== "/dashboard/client" &&
              pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-vault-500 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="ml-auto text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 border-t border-gray-800 pt-4">
        <Link
          href="/dashboard/notifications"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-1",
            "text-gray-400 hover:text-white hover:bg-gray-800"
          )}
        >
          <Bell className="h-4 w-4 shrink-0" />
          <span>Notifications</span>
          {unreadNotifications > 0 && (
            <span className="ml-auto text-xs bg-vault-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {unreadNotifications}
            </span>
          )}
        </Link>
        <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400">
          <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-300 shrink-0">
            {(userName ?? "?").charAt(0).toUpperCase()}
          </div>
          <span className="truncate text-xs">{userName}</span>
        </div>
      </div>
    </aside>
  );
}
