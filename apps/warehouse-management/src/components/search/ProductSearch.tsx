"use client";

import * as React from "react";
import { Search, X, Filter, QrCode } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { searchProductsAction, searchByQRCodeAction } from "~/actions/searchActions";
import type { ProductDocument, ShipmentItemDocument } from "~/lib/typesense-schemas";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

interface ProductSearchProps {
  onResults: (results: ProductDocument[]) => void;
  onLoading?: (loading: boolean) => void;
  onQRCodeFound?: (item: ShipmentItemDocument) => void;
  className?: string;
}

export function ProductSearch({ onResults, onLoading, onQRCodeFound, className }: ProductSearchProps) {
  const [query, setQuery] = React.useState("");
  const [searchMode, setSearchMode] = React.useState<"product" | "qr">("product");
  const [selectedBrand, setSelectedBrand] = React.useState<string>("");
  const [selectedModel, setSelectedModel] = React.useState<string>("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("");
  const [facets, setFacets] = React.useState<{
    brand: Array<{ value: string; count: number }>;
    model: Array<{ value: string; count: number }>;
    category: Array<{ value: string; count: number }>;
  }>({
    brand: [],
    model: [],
    category: [],
  });

  // Check if query looks like a QR code
  React.useEffect(() => {
    const qrPattern = /^(PB\d{11}|https?:\/\/.*PB\d{11})/;
    if (qrPattern.test(query)) {
      setSearchMode("qr");
    } else {
      setSearchMode("product");
    }
  }, [query]);

  // Perform search
  const performSearch = React.useCallback(async () => {
    if (!query && !selectedBrand && !selectedModel && !selectedCategory) {
      onResults([]);
      return;
    }

    onLoading?.(true);
    try {
      if (searchMode === "qr") {
        // QR code search
        const result = await searchByQRCodeAction(query);
        if (result.success && result.data && result.data.hits.length > 0) {
          const item = result.data.hits[0].document;
          onQRCodeFound?.(item);
          
          // Also search for the product
          const productResult = await searchProductsAction(item.product_name, {
            filter: `id:=${item.product_id}`,
          });
          
          if (productResult.success && productResult.data) {
            onResults(productResult.data.hits.map((hit: any) => hit.document));
          }
        } else {
          onResults([]);
        }
      } else {
        // Regular product search
        const filters = [];
        if (selectedBrand) {
          filters.push(`brand:="${selectedBrand}"`);
        }
        if (selectedModel) {
          filters.push(`model:="${selectedModel}"`);
        }
        if (selectedCategory) {
          filters.push(`category:="${selectedCategory}"`);
        }

        const result = await searchProductsAction(query || "*", {
          filter: filters.join(" && "),
          perPage: 50,
        });

        if (result.success && result.data) {
          onResults(result.data.hits.map((hit: any) => hit.document));
          
          // Extract facets
          const facetCounts = result.data.facet_counts || [];
          const brandFacet = facetCounts.find((f: any) => f.field_name === "brand");
          const modelFacet = facetCounts.find((f: any) => f.field_name === "model");
          const categoryFacet = facetCounts.find((f: any) => f.field_name === "category");
          
          setFacets({
            brand: brandFacet?.counts || [],
            model: modelFacet?.counts || [],
            category: categoryFacet?.counts || [],
          });
        }
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      onLoading?.(false);
    }
  }, [query, searchMode, selectedBrand, selectedModel, selectedCategory, onResults, onLoading, onQRCodeFound]);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [performSearch]);

  const clearFilters = () => {
    setQuery("");
    setSelectedBrand("");
    setSelectedModel("");
    setSelectedCategory("");
  };

  const hasFilters = query || selectedBrand || selectedModel || selectedCategory;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          {searchMode === "qr" ? (
            <QrCode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          ) : (
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            placeholder={searchMode === "qr" ? "Nhập mã QR (PB...)" : "Tìm theo tên, thương hiệu, model..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
          {searchMode === "qr" && (
            <Badge variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2">
              Mã QR
            </Badge>
          )}
        </div>

        {/* Filters */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" disabled={searchMode === "qr"}>
              <Filter className="mr-2 h-4 w-4" />
              Bộ lọc
              {(selectedBrand || selectedModel || selectedCategory) && (
                <Badge variant="secondary" className="ml-2">
                  {[selectedBrand, selectedModel, selectedCategory].filter(Boolean).length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              {/* Brand Filter */}
              {facets.brand.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium">Thương hiệu</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {facets.brand.map((brand) => (
                      <label
                        key={brand.value}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="brand"
                          value={brand.value}
                          checked={selectedBrand === brand.value}
                          onChange={(e) => setSelectedBrand(e.target.value)}
                          className="h-4 w-4"
                        />
                        <span className="flex-1">{brand.value}</span>
                        <span className="text-muted-foreground">({brand.count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Model Filter */}
              {facets.model.length > 0 && selectedBrand && (
                <div>
                  <h4 className="mb-2 text-sm font-medium">Model</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {facets.model.map((model) => (
                      <label
                        key={model.value}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="model"
                          value={model.value}
                          checked={selectedModel === model.value}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className="h-4 w-4"
                        />
                        <span className="flex-1">{model.value}</span>
                        <span className="text-muted-foreground">({model.count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Filter */}
              {facets.category.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium">Danh mục</h4>
                  <div className="space-y-1">
                    {facets.category.map((category) => (
                      <label
                        key={category.value}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="category"
                          value={category.value}
                          checked={selectedCategory === category.value}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="h-4 w-4"
                        />
                        <span className="flex-1">{category.value}</span>
                        <span className="text-muted-foreground">({category.count})</span>
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
                    setSelectedBrand("");
                    setSelectedModel("");
                    setSelectedCategory("");
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
      {hasFilters && searchMode !== "qr" && (
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
          {selectedBrand && (
            <Badge variant="secondary">
              Thương hiệu: {selectedBrand}
              <button
                onClick={() => {
                  setSelectedBrand("");
                  setSelectedModel(""); // Clear model when brand is cleared
                }}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedModel && (
            <Badge variant="secondary">
              Model: {selectedModel}
              <button
                onClick={() => setSelectedModel("")}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedCategory && (
            <Badge variant="secondary">
              Danh mục: {selectedCategory}
              <button
                onClick={() => setSelectedCategory("")}
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