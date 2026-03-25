"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useRef } from "react";
import { Package, Search, MapPin, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatItemStatus,
  getStatusColor,
  formatCondition,
  getConditionColor,
  formatDate,
} from "@/lib/utils/format";
import { itemStatusValues, itemConditionValues } from "@/lib/validations/item";

interface ItemRow {
  id: string;
  name: string;
  barcode: string | null;
  status: string;
  condition: string;
  quantity: number;
  primary_photo_url: string | null;
  created_at: string;
  received_at: string | null;
  client: { id: string; name: string } | null;
  location: { id: string; label: string } | null;
}

interface ItemsTableProps {
  items: ItemRow[];
  clients: { id: string; name: string }[];
  total: number;
  page: number;
  pageSize: number;
  filters: { status?: string; client?: string; condition?: string; q?: string };
}

export function ItemsTable({
  items,
  clients,
  total,
  page,
  pageSize,
  filters,
}: ItemsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / pageSize);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateFilter = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateFilter("q", val || undefined), 350);
  }

  const hasFilters = filters.status || filters.client || filters.condition || filters.q;

  function clearAllFilters() {
    router.push(pathname);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Search by name or barcode…"
            defaultValue={filters.q}
            onChange={handleSearchChange}
          />
        </div>

        <Select
          value={filters.status ?? "all"}
          onValueChange={(v) => updateFilter("status", v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {itemStatusValues.map((s) => (
              <SelectItem key={s} value={s}>
                {formatItemStatus(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.client ?? "all"}
          onValueChange={(v) => updateFilter("client", v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.condition ?? "all"}
          onValueChange={(v) => updateFilter("condition", v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All conditions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All conditions</SelectItem>
            {itemConditionValues.map((c) => (
              <SelectItem key={c} value={c}>
                {formatCondition(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-gray-500">
            <X className="mr-1.5 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <Package className="h-12 w-12" />
            <p className="text-sm">No items found</p>
            {hasFilters && (
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 w-12" />
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Condition</th>
                    <th className="px-4 py-3">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() =>
                        router.push(`/dashboard/admin/items/${item.id}`)
                      }
                    >
                      <td className="px-4 py-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden">
                          {item.primary_photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.primary_photo_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-4 w-4 text-gray-300" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-[220px]">
                          {item.name}
                        </p>
                        {item.barcode && (
                          <p className="text-xs text-gray-400 font-mono">{item.barcode}</p>
                        )}
                        {item.quantity > 1 && (
                          <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {item.client?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {item.location ? (
                          <span className="flex items-center gap-1 text-gray-600">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                              {item.location.label}
                            </code>
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(item.status as any)}`}
                        >
                          {formatItemStatus(item.status as any)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${getConditionColor(item.condition as any)}`}
                        >
                          {formatCondition(item.condition as any)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatDate(item.received_at ?? item.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-gray-50">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={`/dashboard/admin/items/${item.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-gray-50"
                >
                  <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                    {item.primary_photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.primary_photo_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-5 w-5 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.client?.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getStatusColor(item.status as any)}`}
                      >
                        {formatItemStatus(item.status as any)}
                      </span>
                      {item.location && (
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                          {item.location.label}
                        </code>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateFilter("page", String(page - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateFilter("page", String(page + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
