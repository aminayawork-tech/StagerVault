"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle, Calendar, Play, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateServiceRequest } from "@/lib/actions/service-requests";

interface ServiceRequestActionsProps {
  srId: string;
  currentStatus: string;
}

export function ServiceRequestActions({ srId, currentStatus }: ServiceRequestActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");

  async function handleUpdate(status: string, extra?: Record<string, unknown>) {
    setLoading(true);
    const result = await updateServiceRequest({ id: srId, status: status as any, ...extra });
    setLoading(false);
    if (!result.success) {
      toast.error(result.error ?? "Failed to update");
      return;
    }
    toast.success(`Request marked as ${status.replace(/_/g, " ")}`);
    router.refresh();
  }

  async function handleSchedule() {
    if (!scheduledDate) { toast.error("Pick a date"); return; }
    await handleUpdate("scheduled", { scheduled_date: scheduledDate });
    setShowSchedule(false);
  }

  const actions: { status: string; label: string; icon: React.ElementType; className: string }[] = [];

  if (currentStatus === "submitted") {
    actions.push({ status: "accepted", label: "Accept", icon: ThumbsUp, className: "text-indigo-600 border-indigo-200 hover:bg-indigo-50" });
  }
  if (["submitted", "accepted"].includes(currentStatus)) {
    actions.push({ status: "schedule", label: "Schedule", icon: Calendar, className: "text-amber-600 border-amber-200 hover:bg-amber-50" });
  }
  if (["accepted", "scheduled"].includes(currentStatus)) {
    actions.push({ status: "in_progress", label: "Start", icon: Play, className: "text-orange-600 border-orange-200 hover:bg-orange-50" });
  }
  if (["accepted", "scheduled", "in_progress"].includes(currentStatus)) {
    actions.push({ status: "completed", label: "Complete", icon: CheckCircle, className: "text-green-600 border-green-200 hover:bg-green-50" });
  }

  if (!actions.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.status}
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() =>
              action.status === "schedule"
                ? setShowSchedule((v) => !v)
                : handleUpdate(action.status)
            }
            className={action.className}
          >
            <action.icon className="mr-2 h-4 w-4" />
            {action.label}
          </Button>
        ))}
      </div>

      {showSchedule && (
        <div className="flex items-end gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div className="space-y-1.5">
            <Label htmlFor="scheduled_date" className="text-amber-800">Scheduled Date</Label>
            <Input
              id="scheduled_date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-48"
            />
          </div>
          <Button size="sm" onClick={handleSchedule} disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white">
            Confirm
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowSchedule(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
