"use client";

import { useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddLocationForm } from "@/components/forms/add-location-form";

interface Location {
  id: string;
  label: string;
  zone: string;
  aisle: string;
  bay: string;
  description: string | null;
  capacity: number | null;
  current_count: number;
}

export function LocationsPageClient({ locations, isAdmin }: { locations: Location[]; isAdmin: boolean }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      {showForm && <AddLocationForm onClose={() => setShowForm(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
          <p className="text-sm text-gray-500 mt-0.5">{locations.length} active locations</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        )}
      </div>

      {!locations.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MapPin className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No locations yet</p>
            <p className="text-sm text-gray-400 mt-1">Add warehouse zones, aisles, and bays to start organizing items.</p>
            {isAdmin && (
              <Button className="mt-4" onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add your first location
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((loc) => (
            <Card key={loc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-gray-900">{loc.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    loc.capacity && loc.current_count >= loc.capacity
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}>
                    {loc.current_count}{loc.capacity ? `/${loc.capacity}` : ""} items
                  </span>
                </div>
                {loc.description && (
                  <p className="text-sm text-gray-500">{loc.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Zone {loc.zone} · Aisle {loc.aisle} · Bay {loc.bay}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
