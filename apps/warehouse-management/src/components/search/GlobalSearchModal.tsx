"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Package, FileText, Home, QrCode, Loader2 } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { globalSearchAction } from "~/actions/searchActions";
import type { 
  ProductDocument, 
  ShipmentDocument, 
  ShipmentItemDocument, 
  StorageDocument 
} from "~/lib/typesense-schemas";

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchModal({ open, onOpenChange }: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [results, setResults] = React.useState<{
    products: ProductDocument[];
    shipments: ShipmentDocument[];
    items: ShipmentItemDocument[];
    storages: StorageDocument[];
  }>({
    products: [],
    shipments: [],
    items: [],
    storages: [],
  });
  
  React.useEffect(() => {
    if (!query) {
      setResults({ products: [], shipments: [], items: [], storages: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const searchResults = await globalSearchAction(query, { limit: 5 });
        
        if (searchResults.success) {
          setResults({
            products: searchResults.products?.hits?.map((hit: any) => hit?.document) ?? [],
            shipments: searchResults.shipments?.hits?.map((hit: any) => hit?.document) ?? [],
            items: searchResults.items?.hits?.map((hit: any) => hit?.document) ?? [],
            storages: searchResults.storages?.hits?.map((hit: any) => hit?.document) ?? [],
          });
        } else {
          console.error("GlobalSearchModal: Search failed:", searchResults.error);
          setResults({
            products: [],
            shipments: [],
            items: [],
            storages: [],
          });
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = React.useCallback((callback: () => void) => {
    onOpenChange(false);
    callback();
  }, [onOpenChange]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("vi-VN");
  };

  const hasResults = 
    results.products.length > 0 || 
    results.shipments.length > 0 || 
    results.items.length > 0 || 
    results.storages.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} shouldFilter={false}>
      <CommandInput
        placeholder="Tìm kiếm sản phẩm, phiếu nhập, mã QR sản phẩm, kho..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[500px]">
        {isLoading && (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Đang tìm kiếm...
          </div>
        )}

        {!isLoading && query && !hasResults && (
          <CommandEmpty>
            Không tìm thấy kết quả cho "{query}"
          </CommandEmpty>
        )}

        {results.products.length > 0 && (
          <CommandGroup heading="Sản phẩm">
            {results.products.map((product, index) => (
              <CommandItem
                key={`product-${product.id}`}
                value={`product-${product.id}-${index}`}
                onSelect={() => handleSelect(() => {
                  // TODO: Redirect to product detail page when business logic is defined
                  router.push('/products');
                })}
              >
                <Package className="mr-2 h-4 w-4" />
                <div className="flex-1">
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {product.brand} - {product.model}
                    {product.qr_code && ` • ${product.qr_code}`}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.shipments.length > 0 && (
          <CommandGroup heading="Phiếu nhập">
            {results.shipments.map((shipment) => (
              <CommandItem
                key={shipment.id}
                value={`shipment-${shipment.id}`}
                onSelect={() => handleSelect(() => {
                  router.push(`/shipments/${shipment.id}`);
                })}
              >
                <FileText className="mr-2 h-4 w-4" />
                <div className="flex-1">
                  <div className="font-medium">{shipment.receipt_number}</div>
                  <div className="text-sm text-muted-foreground">
                    {shipment.supplier_name} • {formatDate(shipment.receipt_date)}
                    <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                      {shipment.status === "pending" && "Chờ xử lý"}
                      {shipment.status === "received" && "Đã nhận"}
                      {shipment.status === "completed" && "Hoàn thành"}
                    </span>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.items.length > 0 && (
          <CommandGroup heading="Sản phẩm (Mã QR)">
            {results.items.map((item, index) => (
              <CommandItem
                key={`item-${item.id}-${item.qr_code}`}
                value={`item-${item.id}-${item.qr_code || index}`}
                onSelect={() => handleSelect(() => {
                  router.push(`/items/${item.id}`);
                })}
              >
                <QrCode className="mr-2 h-4 w-4" />
                <div className="flex-1">
                  <div className="font-medium">{item.qr_code}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.product_name} • {item.shipment_receipt_number}
                    {item.storage_name && ` • Kho: ${item.storage_name}`}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.storages.length > 0 && (
          <CommandGroup heading="Kho">
            {results.storages.map((storage) => (
              <CommandItem
                key={storage.id}
                value={`storage-${storage.id}`}
                onSelect={() => handleSelect(() => {
                  router.push(`/storages/${storage.id}`);
                })}
              >
                <Home className="mr-2 h-4 w-4" />
                <div className="flex-1">
                  <div className="font-medium">{storage.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {storage.location} • Sức chứa: {storage.used_capacity}/{storage.capacity}
                    <span className="ml-2">
                      ({Math.round(storage.utilization_rate * 100)}% đã sử dụng)
                    </span>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}