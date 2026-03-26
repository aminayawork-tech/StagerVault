"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, XCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { clientEditServiceRequest, clientCancelServiceRequest } from "@/lib/actions/service-requests";

interface Props {
  sr: {
    id: string;
    status: string;
    title: string;
    description: string | null;
    delivery_address: string | null;
    requested_date: string | null;
    notes: string | null;
  };
}

const EDITABLE_STATUSES = ["submitted", "draft"];
const CANCELLABLE_STATUSES = ["submitted", "draft", "accepted", "scheduled"];

export function ClientSRActions({ sr }: Props) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const canEdit = EDITABLE_STATUSES.includes(sr.status);
  const canCancel = CANCELLABLE_STATUSES.includes(sr.status);

  if (!canEdit && !canCancel) return null;

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    const result = await clientEditServiceRequest(sr.id, {
      title: fd.get("title") as string,
      description: (fd.get("description") as string) || undefined,
      delivery_address: (fd.get("delivery_address") as string) || undefined,
      requested_date: (fd.get("requested_date") as string) || undefined,
      notes: (fd.get("notes") as string) || undefined,
    });
    setSaving(false);
    if (!result.success) { toast.error(result.error); return; }
    toast.success("Request updated — warehouse has been notified");
    setShowEdit(false);
    router.refresh();
  }

  async function handleCancel() {
    setSaving(true);
    const result = await clientCancelServiceRequest(sr.id);
    setSaving(false);
    if (!result.success) { toast.error(result.error); return; }
    toast.success("Request cancelled — warehouse has been notified");
    setShowCancelConfirm(false);
    router.refresh();
  }

  return (
    <>
      {/* Action buttons */}
      <div className="flex gap-2">
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit Request
          </Button>
        )}
        {canCancel && (
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setShowCancelConfirm(true)}
          >
            <XCircle className="mr-1.5 h-3.5 w-3.5" />
            Cancel Request
          </Button>
        )}
      </div>

      {/* Edit modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Edit Request</h2>
              <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" name="title" defaultValue={sr.title} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" defaultValue={sr.description ?? ""} rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="delivery_address">Delivery / Staging Address</Label>
                <Input id="delivery_address" name="delivery_address" defaultValue={sr.delivery_address ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="requested_date">Preferred Date</Label>
                <Input
                  id="requested_date"
                  name="requested_date"
                  type="date"
                  defaultValue={sr.requested_date?.split("T")[0] ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea id="notes" name="notes" defaultValue={sr.notes ?? ""} rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel confirmation */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Cancel Request?</h2>
            <p className="text-sm text-gray-600">
              This will cancel <strong>"{sr.title}"</strong> and notify the warehouse. The record will be kept for your history.
            </p>
            {sr.status === "scheduled" && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                This request is already scheduled. Cancelling will notify the team to stop preparations.
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>Keep It</Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleCancel}
                disabled={saving}
              >
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cancelling…</> : "Yes, Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
