'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '~/lib/utils';
import ColorDot from '~/components/ui/ColorDot';
import { Button } from '~/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '~/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import type { Color } from '~/lib/schemas/colorSchema';

interface ColorComboboxProps {
  colors: Color[];
  value?: string; // colorId stored in product
  onValueChange: (colorId: string) => void;
  disabled?: boolean;
  onCreateRequest?: (prefill?: string) => void;
}

export default function ColorCombobox({ colors: initialColors, value, onValueChange, disabled = false, onCreateRequest }: ColorComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [colors, setColors] = useState<Color[]>(initialColors);

  useEffect(() => {
    setColors(initialColors);
  }, [initialColors]);

  const selected = colors.find((c) => c.id === value);

  const filtered = searchValue
    ? colors.filter((c) => c.name.toLowerCase().includes(searchValue.toLowerCase()))
    : colors;

  const exactMatch = colors.some((c) => c.name.toLowerCase() === searchValue.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <div className="flex items-center gap-2">
            {selected ? (
              <span className="inline-flex items-center gap-2">
                <ColorDot hex={selected.hex} size={14} title={selected.name} />
                {selected.name}
              </span>
            ) : value ? (
              <span>{value}</span>
            ) : (
              'Chọn màu...'
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Tìm hoặc thêm màu..." value={searchValue} onValueChange={setSearchValue} />
          <CommandList>
            {filtered.length === 0 && !searchValue && <CommandEmpty>Chưa có màu nào.</CommandEmpty>}

            {searchValue && !exactMatch && (
              <CommandGroup heading="Tạo mới">
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    onCreateRequest?.(searchValue);
                  }}
                  className="cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm màu "{searchValue}"
                </CommandItem>
              </CommandGroup>
            )}

            {filtered.length > 0 && (
              <CommandGroup heading="Màu có sẵn">
                {filtered.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.name}
                    onSelect={() => {
                      onValueChange(c.id === value ? '' : c.id);
                      setOpen(false);
                      setSearchValue('');
                    }}
                    className="cursor-pointer"
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === c.id ? 'opacity-100' : 'opacity-0')} />
                    <span className="inline-flex items-center gap-2">
                      <ColorDot hex={c.hex} size={14} title={c.name} />
                      {c.name}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
