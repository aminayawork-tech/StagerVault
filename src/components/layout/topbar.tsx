"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Bell, LogOut, User, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileSidebar } from "./mobile-sidebar";
import type { UserRole } from "@/types";

interface TopbarProps {
  role: UserRole;
  warehouseName: string;
  userName: string;
  unreadNotifications?: number;
}

export function Topbar({ role, warehouseName, userName, unreadNotifications = 0 }: TopbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center gap-3 h-14 px-4 bg-white border-b border-gray-200 lg:px-6">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Mobile logo */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="w-7 h-7 rounded-lg bg-vault-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">SV</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">{warehouseName}</span>
        </div>

        <div className="flex-1" />

        {/* Notifications */}
        <Link href="/dashboard/notifications" className="relative p-2 text-gray-500 hover:text-gray-700">
          <Bell className="h-5 w-5" />
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </Link>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <div className="w-7 h-7 rounded-full bg-vault-100 flex items-center justify-center text-vault-700 text-sm font-semibold">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                {userName}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/admin/settings">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Mobile drawer */}
      <MobileSidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        role={role}
        warehouseName={warehouseName}
        userName={userName}
        unreadNotifications={unreadNotifications}
      />
    </>
  );
}
