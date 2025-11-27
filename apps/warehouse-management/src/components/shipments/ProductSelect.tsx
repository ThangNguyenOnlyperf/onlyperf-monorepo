'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import type { Product } from '~/lib/schemas/productSchema';
import ColorDot from '~/components/ui/ColorDot';

interface ProductSelectProps {
  products: Product[];
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ProductSelect({
  products,
  value,
  onValueChange,
  disabled = false,
  placeholder = 'Chọn sản phẩm...',
}: ProductSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const selectedProduct = products.find((product) => product.id === value);

  const filteredProducts = searchValue
    ? products.filter((product) => {
        const searchLower = searchValue.toLowerCase();
        return (
          product.name.toLowerCase().includes(searchLower) ||
          product.model.toLowerCase().includes(searchLower) ||
          product.brand.toLowerCase().includes(searchLower)
        );
      })
    : products;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between min-h-[44px] text-left font-normal"
        >
          <span className="truncate flex items-center gap-2">
            {selectedProduct && (
              <ColorDot hex={selectedProduct.colorHex} size={12} title={selectedProduct.colorName ?? ''} />
            )}
            {selectedProduct ? selectedProduct.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Tìm sản phẩm..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {filteredProducts.length === 0 && (
              <CommandEmpty>Không tìm thấy sản phẩm.</CommandEmpty>
            )}
            
            <CommandGroup>
              {filteredProducts.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.id}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? '' : currentValue);
                    setOpen(false);
                    setSearchValue('');
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === product.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium flex items-center gap-2">
                      <ColorDot hex={product.colorHex} size={12} title={product.colorName ?? ''} />
                      {product.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {product.category || 'Chưa phân loại'}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
