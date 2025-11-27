"use client";

import * as React from "react";
import { Search, X, Sliders } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Slider } from "~/components/ui/slider";
import { searchStoragesAction } from "~/actions/searchActions";
import type { StorageDocument } from "~/lib/typesense-schemas";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

interface StorageSearchProps {
  onResults: (results: StorageDocument[]) => void;
  onLoading?: (loading: boolean) => void;
  className?: string;
}

export function StorageSearch({ onResults, onLoading, className }: StorageSearchProps) {
  const [query, setQuery] = React.useState("");
  const [minCapacity, setMinCapacity] = React.useState<number>(0);
  const [maxUtilization, setMaxUtilization] = React.useState<number>(100);
  const [selectedLocation, setSelectedLocation] = React.useState<string>("");
  const [selectedPriority, setSelectedPriority] = React.useState<string>("");
  const [facets, setFacets] = React.useState<{
    location: Array<{ value: string; count: number }>;
    priority: Array<{ value: string; count: number }>;
  }>({
    location: [],
    priority: [],
  });

  // Perform search
  const performSearch = React.useCallback(async () => {
    onLoading?.(true);
    try {
      // Build filters
      const filters = [];
      if (selectedLocation) {
        filters.push(`location:="${selectedLocation}"`);
      }
      if (selectedPriority) {
        filters.push(`priority:=${selectedPriority}`);
      }

      const result = await searchStoragesAction(query || "*", {
        filter: filters.join(" && "),
        minCapacity: minCapacity > 0 ? minCapacity : undefined,
        maxUtilization: maxUtilization < 100 ? maxUtilization / 100 : undefined,
        perPage: 50,
      });

      if (result.success && result.data) {
        onResults(result.data.hits.map((hit: any) => hit.document));
        
        // Extract facets
        const facetCounts = result.data.facet_counts || [];
        const locationFacet = facetCounts.find((f: any) => f.field_name === "location");
        const priorityFacet = facetCounts.find((f: any) => f.field_name === "priority");
        
        setFacets({
          location: locationFacet?.counts || [],
          priority: priorityFacet?.counts || [],
        });
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      onLoading?.(false);
    }
  }, [query, selectedLocation, selectedPriority, minCapacity, maxUtilization, onResults, onLoading]);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [performSearch]);

  const clearFilters = () => {
    setQuery("");
    setMinCapacity(0);
    setMaxUtilization(100);
    setSelectedLocation("");
    setSelectedPriority("");
  };

  const hasFilters = query || minCapacity > 0 || maxUtilization < 100 || selectedLocation || selectedPriority;

  const priorityLabels: Record<string, string> = {
    "1": "Rất cao",
    "2": "Cao", 
    "3": "Trung bình",
    "4": "Thấp",
    "5": "Rất thấp",
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên kho, vị trí..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <Sliders className="mr-2 h-4 w-4" />
              Bộ lọc
              {(selectedLocation || selectedPriority || minCapacity > 0 || maxUtilization < 100) && (
                <Badge variant="secondary" className="ml-2">
                  {[selectedLocation, selectedPriority, minCapacity > 0, maxUtilization < 100].filter(Boolean).length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              {/* Location Filter */}
              {facets.location.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium">Vị trí</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {facets.location.map((location) => (
                      <label
                        key={location.value}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="location"
                          value={location.value}
                          checked={selectedLocation === location.value}
                          onChange={(e) => setSelectedLocation(e.target.value)}
                          className="h-4 w-4"
                        />
                        <span className="flex-1">{location.value}</span>
                        <span className="text-muted-foreground">({location.count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Priority Filter */}
              {facets.priority.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium">Độ ưu tiên</h4>
                  <div className="space-y-1">
                    {facets.priority.map((priority) => (
                      <label
                        key={priority.value}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="priority"
                          value={priority.value}
                          checked={selectedPriority === priority.value}
                          onChange={(e) => setSelectedPriority(e.target.value)}
                          className="h-4 w-4"
                        />
                        <span className="flex-1">
                          {priorityLabels[priority.value] || `Mức ${priority.value}`}
                        </span>
                        <span className="text-muted-foreground">({priority.count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Capacity Filter */}
              <div>
                <h4 className="mb-2 text-sm font-medium">
                  Sức chứa tối thiểu: {minCapacity}
                </h4>
                <Slider
                  value={[minCapacity]}
                  onValueChange={([value]) => setMinCapacity(value ?? 0)}
                  max={1000}
                  step={10}
                  className="w-full"
                />
              </div>

              {/* Utilization Filter */}
              <div>
                <h4 className="mb-2 text-sm font-medium">
                  Tỷ lệ sử dụng tối đa: {maxUtilization}%
                </h4>
                <Slider
                  value={[maxUtilization]}
                  onValueChange={([value]) => setMaxUtilization(value ?? 100)}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Clear Filters */}
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedLocation("");
                    setSelectedPriority("");
                    setMinCapacity(0);
                    setMaxUtilization(100);
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
          {selectedLocation && (
            <Badge variant="secondary">
              Vị trí: {selectedLocation}
              <button
                onClick={() => setSelectedLocation("")}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedPriority && (
            <Badge variant="secondary">
              Ưu tiên: {priorityLabels[selectedPriority] || `Mức ${selectedPriority}`}
              <button
                onClick={() => setSelectedPriority("")}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {minCapacity > 0 && (
            <Badge variant="secondary">
              Sức chứa ≥ {minCapacity}
              <button
                onClick={() => setMinCapacity(0)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {maxUtilization < 100 && (
            <Badge variant="secondary">
              Sử dụng ≤ {maxUtilization}%
              <button
                onClick={() => setMaxUtilization(100)}
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