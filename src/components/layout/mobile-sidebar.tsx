"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Sidebar } from "./sidebar";
import type { UserRole } from "@/types";

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  role: UserRole;
  warehouseName: string;
  userName: string;
  unreadNotifications?: number;
}

export function MobileSidebar({ open, onClose, ...sidebarProps }: MobileSidebarProps) {
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    onClose();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="absolute left-0 top-0 bottom-0 w-64 flex flex-col">
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <Sidebar {...sidebarProps} className="flex flex-col w-full h-full bg-gray-900 text-white overflow-y-auto" />
      </div>
    </div>
  );
}
