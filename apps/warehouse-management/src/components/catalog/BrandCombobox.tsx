'use client';

import { useState, useEffect, useTransition } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
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
import { toast } from 'sonner';
import { createBrandAction } from '~/actions/brandActions';
import type { Brand } from '~/lib/schemas/brandSchema';

interface BrandComboboxProps {
  brands: Brand[];
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export default function BrandCombobox({
  brands: initialBrands,
  value,
  onValueChange,
  disabled = false,
}: BrandComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [brands, setBrands] = useState<Brand[]>(initialBrands);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setBrands(initialBrands);
  }, [initialBrands]);

  const selectedBrand = brands.find((brand) => brand.id === value);

  const handleCreateBrand = async (name: string) => {
    startTransition(async () => {
      const result = await createBrandAction({ name });
      
      if (result.success && result.data) {
        setBrands([...brands, result.data]);
        onValueChange(result.data.id);
        setOpen(false);
        setSearchValue('');
        toast.success(result.message || 'Tạo thương hiệu thành công');
      } else {
        toast.error(result.message || 'Không thể tạo thương hiệu');
      }
    });
  };

  const filteredBrands = searchValue
    ? brands.filter((brand) =>
        brand.name.toLowerCase().includes(searchValue.toLowerCase())
      )
    : brands;

  const exactMatch = brands.some(
    (brand) => brand.name.toLowerCase() === searchValue.toLowerCase()
  );

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild >
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isPending}
          className="w-full justify-between h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          {selectedBrand ? selectedBrand.name : 'Chọn thương hiệu...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command shouldFilter={false} >
          <CommandInput 
            placeholder="Tìm hoặc thêm thương hiệu..." 
            value={searchValue}
            className='pl-2'
            onValueChange={setSearchValue}
          />
          <CommandList>
            {filteredBrands.length === 0 && !searchValue && (
              <CommandEmpty>Chưa có thương hiệu nào.</CommandEmpty>
            )}
            
            {searchValue && !exactMatch && (
              <CommandGroup heading="Tạo mới">
                <CommandItem
                  onSelect={() => handleCreateBrand(searchValue)}
                  disabled={isPending}
                  className="cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm thương hiệu "{searchValue}"
                </CommandItem>
              </CommandGroup>
            )}

            {filteredBrands.length > 0 && (
              <CommandGroup heading="Thương hiệu có sẵn">
                {filteredBrands.map((brand) => (
                  <CommandItem
                    key={brand.id}
                    value={brand.id}
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
                        value === brand.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {brand.name}
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