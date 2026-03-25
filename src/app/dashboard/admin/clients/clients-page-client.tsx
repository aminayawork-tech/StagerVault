"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, Mail, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddClientForm } from "@/components/forms/add-client-form";
import { deactivateClient } from "@/lib/actions/clients";
import { formatCurrency } from "@/lib/utils/format";

interface Client {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  billing_rate_monthly: number | null;
  is_active: boolean;
}

export function ClientsPageClient({ clients, isAdmin }: { clients: Client[]; isAdmin: boolean }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(client: Client) {
    if (!confirm(`Deactivate "${client.name}"? They will no longer appear in active lists.`)) return;
    setDeletingId(client.id);
    const result = await deactivateClient(client.id);
    setDeletingId(null);
    if (!result.success) {
      toast.error(result.error ?? "Failed to deactivate client");
      return;
    }
    toast.success(`${client.name} deactivated`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {showForm && <AddClientForm onClose={() => setShowForm(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clients.length} clients</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        )}
      </div>

      {!clients.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No clients yet</p>
            <p className="text-sm text-gray-400 mt-1">Add stagers and designers who store items in your warehouse.</p>
            {isAdmin && (
              <Button className="mt-4" onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add your first client
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold text-sm shrink-0">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${client.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {client.is_active ? "Active" : "Inactive"}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(client)}
                        disabled={deletingId === client.id}
                        className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                        title="Deactivate client"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="font-semibold text-gray-900">{client.name}</p>
                {client.contact_name && (
                  <p className="text-sm text-gray-500 mt-0.5">{client.contact_name}</p>
                )}
                <div className="mt-3 space-y-1">
                  {client.email && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Mail className="h-3 w-3" />
                      {client.email}
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Phone className="h-3 w-3" />
                      {client.phone}
                    </div>
                  )}
                </div>
                {client.billing_rate_monthly && (
                  <p className="text-xs text-gray-400 mt-3">
                    {formatCurrency(client.billing_rate_monthly)}/item/mo
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


interface Client {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  billing_rate_monthly: number | null;
  is_active: boolean;
}

export function ClientsPageClient({ clients, isAdmin }: { clients: Client[]; isAdmin: boolean }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      {showForm && <AddClientForm onClose={() => setShowForm(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clients.length} clients</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        )}
      </div>

      {!clients.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No clients yet</p>
            <p className="text-sm text-gray-400 mt-1">Add stagers and designers who store items in your warehouse.</p>
            {isAdmin && (
              <Button className="mt-4" onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add your first client
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold text-sm shrink-0">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${client.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {client.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="font-semibold text-gray-900">{client.name}</p>
                {client.contact_name && (
                  <p className="text-sm text-gray-500 mt-0.5">{client.contact_name}</p>
                )}
                <div className="mt-3 space-y-1">
                  {client.email && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Mail className="h-3 w-3" />
                      {client.email}
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Phone className="h-3 w-3" />
                      {client.phone}
                    </div>
                  )}
                </div>
                {client.billing_rate_monthly && (
                  <p className="text-xs text-gray-400 mt-3">
                    {formatCurrency(client.billing_rate_monthly)}/item/mo
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
