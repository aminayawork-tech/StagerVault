import { format, formatDistanceToNow, parseISO } from "date-fns";
import type { ItemStatus, ItemCondition, ServiceRequestStatus } from "@/types";

// ─── Currency ─────────────────────────────────────────────────────────────────

export function formatCurrency(
  amount: number | null | undefined,
  currency = "USD"
): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// ─── Dates ────────────────────────────────────────────────────────────────────

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return format(parseISO(dateStr), "MMM d, yyyy");
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return format(parseISO(dateStr), "MMM d, yyyy h:mm a");
}

export function formatRelative(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
}

// ─── Item Status ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ItemStatus, string> = {
  pending_intake: "Pending Intake",
  received: "Received",
  stored: "In Storage",
  assembled: "Assembled",
  staged: "Staged",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  returned: "Returned",
  damaged: "Damaged",
  disposed: "Disposed",
};

export function formatItemStatus(status: ItemStatus): string {
  return STATUS_LABELS[status] ?? status;
}

const STATUS_COLORS: Record<ItemStatus, string> = {
  pending_intake: "bg-gray-100 text-gray-700",
  received: "bg-blue-100 text-blue-700",
  stored: "bg-green-100 text-green-700",
  assembled: "bg-purple-100 text-purple-700",
  staged: "bg-amber-100 text-amber-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  delivered: "bg-teal-100 text-teal-700",
  returned: "bg-indigo-100 text-indigo-700",
  damaged: "bg-red-100 text-red-700",
  disposed: "bg-gray-200 text-gray-500",
};

export function getStatusColor(status: ItemStatus): string {
  return STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600";
}

// ─── Condition ────────────────────────────────────────────────────────────────

const CONDITION_LABELS: Record<ItemCondition, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  damaged: "Damaged",
  unknown: "Unknown",
};

export function formatCondition(condition: ItemCondition): string {
  return CONDITION_LABELS[condition] ?? condition;
}

const CONDITION_COLORS: Record<ItemCondition, string> = {
  excellent: "bg-green-50 text-green-700 border border-green-200",
  good: "bg-blue-50 text-blue-700 border border-blue-200",
  fair: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  damaged: "bg-red-50 text-red-700 border border-red-200",
  unknown: "bg-gray-50 text-gray-600 border border-gray-200",
};

export function getConditionColor(condition: ItemCondition): string {
  return CONDITION_COLORS[condition] ?? "bg-gray-50 text-gray-600";
}

// ─── Service Request Status ───────────────────────────────────────────────────

const SR_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  accepted: "Accepted",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function formatServiceStatus(status: ServiceRequestStatus): string {
  return SR_STATUS_LABELS[status] ?? status;
}

const SR_STATUS_COLORS: Record<ServiceRequestStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  accepted: "bg-indigo-100 text-indigo-700",
  scheduled: "bg-purple-100 text-purple-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

export function getServiceStatusColor(status: ServiceRequestStatus): string {
  return SR_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600";
}

// ─── Storage billing ──────────────────────────────────────────────────────────

export function calculateStorageDays(
  checkInAt: string,
  checkOutAt?: string | null
): number {
  const start = parseISO(checkInAt);
  const end = checkOutAt ? parseISO(checkOutAt) : new Date();
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function calculateStorageCharge(
  days: number,
  rateMonthly: number
): number {
  const dailyRate = rateMonthly / 30;
  return Math.round(days * dailyRate * 100) / 100;
}
