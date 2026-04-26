import { ArrowRight, MapPin, MoveRight, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatItemStatus, getStatusColor, formatDateTime } from "@/lib/utils/format";

interface EventRecord {
  id: string;
  event_type: string;
  created_at: string;
  notes: string | null;
  condition_before: string | null;
  condition_after: string | null;
  from_location: { label: string } | null;
  to_location: { label: string } | null;
  performer: { full_name: string } | null;
}

const STATUS_ICONS: Record<string, string> = {
  received: "📦",
  stored: "🏷️",
  assembled: "🔧",
  staged: "🏠",
  out_for_delivery: "🚚",
  delivered: "✅",
  returned: "↩️",
  damaged: "⚠️",
  disposed: "🗑️",
};

export function ItemEventHistory({ events }: { events: EventRecord[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Item History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gray-100" />

          <ul className="space-y-0">
            {events.map((event, i) => (
              <li key={event.id} className="relative flex gap-4 px-6 py-3">
                {/* Icon */}
                <div className="relative z-10 flex-shrink-0 w-5 h-5 rounded-full bg-white ring-2 ring-gray-200 mt-0.5 flex items-center justify-center text-[10px]">
                  {STATUS_ICONS[event.event_type] ?? "•"}
                </div>

                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      {/* Show "Moved" badge when it's a location-change event */}
                      {event.from_location && event.to_location ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200">
                          <MoveRight className="h-3 w-3" />
                          Moved
                        </span>
                      ) : (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium inline-block ${getStatusColor(event.event_type as any)}`}
                        >
                          {formatItemStatus(event.event_type as any)}
                        </span>
                      )}

                      {/* Location change */}
                      {(event.from_location || event.to_location) && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {event.from_location?.label && (
                            <code className="bg-gray-100 px-1 rounded">
                              {event.from_location.label}
                            </code>
                          )}
                          {event.from_location && event.to_location && (
                            <ArrowRight className="h-3 w-3" />
                          )}
                          {event.to_location?.label && (
                            <code className="bg-gray-100 px-1 rounded">
                              {event.to_location.label}
                            </code>
                          )}
                        </div>
                      )}

                      {/* Notes */}
                      {event.notes && (
                        <p className="mt-1 text-xs text-gray-600 italic">
                          &quot;{event.notes}&quot;
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDateTime(event.created_at)}
                      </p>
                      {event.performer?.full_name && (
                        <p className="text-xs text-gray-400 flex items-center justify-end gap-1 mt-0.5">
                          <User className="h-3 w-3" />
                          {event.performer.full_name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
