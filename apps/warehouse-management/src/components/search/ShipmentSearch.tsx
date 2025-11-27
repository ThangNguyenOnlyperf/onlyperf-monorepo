"use client";

import * as React from "react";
import { Search, X, Calendar, Filter } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Calendar as CalendarComponent } from "~/components/ui/calendar";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { searchShipmentsAction } from "~/actions/searchActions";
import type { ShipmentDocument } from "~/lib/typesense-schemas";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

interface ShipmentSearchProps {
  onResults: (results: ShipmentDocument[]) => void;
  onLoading?: (loading: boolean) => void;
  className?: string;
}

export function ShipmentSearch({ onResults, onLoading, className }: ShipmentSearchProps) {
  const [query, setQuery] = React.useState("");
  const [dateRange, setDateRange] = React.useState<{
    from?: Date;
    to?: Date;
  }>({});
  const [selectedStatus, setSelectedStatus] = React.useState<string>("");
  const [selectedSupplier, setSelectedSupplier] = React.useState<string>("");
  const [facets, setFacets] = React.useState<{
    status: Array<{ value: string; count: number }>;
    supplier: Array<{ value: string; count: number }>;
  }>({
    status: [],
    supplier: [],
  });

  // Perform search
  const performSearch = React.useCallback(async () => {
    onLoading?.(true);
    try {
      // Build filters
      const filters = [];
      if (selectedStatus) {
        filters.push(`status:=${selectedStatus}`);
      }
      if (selectedSupplier) {
        filters.push(`supplier_name:="${selectedSupplier}"`);
      }

      const result = await searchShipmentsAction(query || "*", {
        filter: filters.join(" && "),
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        perPage: 50,
      });

      if (result.success && result.data) {
        onResults(result.data.hits.map((hit: any) => hit.document));
        
        // Extract facets
        const facetCounts = result.data.facet_counts || [];
        const statusFacet = facetCounts.find((f: any) => f.field_name === "status");
        const supplierFacet = facetCounts.find((f: any) => f.field_name === "supplier_name");
        
        setFacets({
          status: statusFacet?.counts || [],
          supplier: supplierFacet?.counts || [],
        });
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      onLoading?.(false);
    }
  }, [query, selectedStatus, selectedSupplier, dateRange, onResults, onLoading]);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [performSearch]);

  const clearFilters = () => {
    setQuery("");
    setDateRange({});
    setSelectedStatus("");
    setSelectedSupplier("");
  };

  const hasFilters = query || dateRange.from || dateRange.to || selectedStatus || selectedSupplier;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo số phiếu, nhà cung cấp..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {/* Date Range Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
              <Calendar className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "dd/MM/yyyy")} -{" "}
                    {format(dateRange.to, "dd/MM/yyyy")}
                  </>
                ) : (
                  format(dateRange.from, "dd/MM/yyyy")
                )
              ) : (
                <span>Chọn ngày nhập</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="range"
              defaultMonth={dateRange.from}
              selected={{
                from: dateRange.from,
                to: dateRange.to,
              }}
              onSelect={(range) => {
                setDateRange({
                  from: range?.from,
                  to: range?.to,
                });
              }}
              locale={vi}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* More Filters */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Bộ lọc
              {(selectedStatus || selectedSupplier) && (
                <Badge variant="secondary" className="ml-2">
                  {[selectedStatus, selectedSupplier].filter(Boolean).length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              {/* Status Filter */}
              {facets.status.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium">Trạng thái</h4>
                  <div className="space-y-1">
                    {facets.status.map((status) => (
                      <label
                        key={status.value}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="status"
                          value={status.value}
                          checked={selectedStatus === status.value}
                          onChange={(e) => setSelectedStatus(e.target.value)}
                          className="h-4 w-4"
                        />
                        <span className="flex-1">
                          {status.value === "pending" && "Chờ xử lý"}
                          {status.value === "received" && "Đã nhận"}
                          {status.value === "completed" && "Hoàn thành"}
                        </span>
                        <span className="text-muted-foreground">({status.count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Supplier Filter */}
              {facets.supplier.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium">Nhà cung cấp</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {facets.supplier.map((supplier) => (
                      <label
                        key={supplier.value}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="supplier"
                          value={supplier.value}
                          checked={selectedSupplier === supplier.value}
                          onChange={(e) => setSelectedSupplier(e.target.value)}
                          className="h-4 w-4"
                        />
                        <span className="flex-1 truncate">{supplier.value}</span>
                        <span className="text-muted-foreground">({supplier.count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Clear Filters */}
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedStatus("");
                    setSelectedSupplier("");
                  }}
                  className="w-full"
                >
                  Xóa bộ lọc
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear All */}
        {hasFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {query && (
            <Badge variant="secondary">
              Từ khóa: {query}
              <button
                onClick={() => setQuery("")}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {dateRange.from && (
            <Badge variant="secondary">
              Ngày: {format(dateRange.from, "dd/MM/yyyy")}
              {dateRange.to && ` - ${format(dateRange.to, "dd/MM/yyyy")}`}
              <button
                onClick={() => setDateRange({})}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedStatus && (
            <Badge variant="secondary">
              Trạng thái: {
                selectedStatus === "pending" ? "Chờ xử lý" :
                selectedStatus === "received" ? "Đã nhận" : "Hoàn thành"
              }
              <button
                onClick={() => setSelectedStatus("")}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedSupplier && (
            <Badge variant="secondary">
              Nhà cung cấp: {selectedSupplier}
              <button
                onClick={() => setSelectedSupplier("")}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}