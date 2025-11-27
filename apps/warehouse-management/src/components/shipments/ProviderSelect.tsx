'use client';

import { useState } from 'react';
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
import { Badge } from '~/components/ui/badge';
import type { Provider } from '~/actions/providerActions';
import { Separator } from '../ui/separator';

interface ProviderSelectProps {
  providers: Provider[];
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const providerTypeLabels = {
  supplier: 'Nhà cung cấp',
  retailer: 'Đại lý',
  seller: 'Người bán',
};

const providerTypeBadgeStyles = {
  supplier: 'bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-700 border-blue-500/20',
  retailer: 'bg-gradient-to-r from-purple-500/10 to-purple-600/10 text-purple-700 border-purple-500/20',
  seller: 'bg-gradient-to-r from-green-500/10 to-green-600/10 text-green-700 border-green-500/20',
};

export default function ProviderSelect({
  providers,
  value,
  onValueChange,
  disabled = false,
  placeholder = 'Chọn nhà cung cấp...',
}: ProviderSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const selectedProvider = providers.find((provider) => provider.id === value);

  const filteredProviders = searchValue
    ? providers.filter((provider) => {
        const searchLower = searchValue.toLowerCase();
        return (
          provider.name.toLowerCase().includes(searchLower) ||
          provider.telephone.toLowerCase().includes(searchLower) ||
          provider.taxCode?.toLowerCase().includes(searchLower)
        );
      })
    : providers;

  // Group providers by type
  const groupedProviders = filteredProviders.reduce((acc, provider) => {
    const type = provider.type as keyof typeof providerTypeLabels;
    acc[type] ??= [];
    acc[type].push(provider);
    return acc;
  }, {} as Record<string, Provider[]>);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild className='prose'>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between min-h-[44px] text-left font-normal"
        >
          <span className="truncate">
            {selectedProvider ? (
              <div className="flex items-center gap-2">
                <span>{selectedProvider.name}</span>
                <Badge className={cn("text-xs", providerTypeBadgeStyles[selectedProvider.type as keyof typeof providerTypeBadgeStyles])}>
                  {providerTypeLabels[selectedProvider.type as keyof typeof providerTypeLabels]}
                </Badge>
              </div>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='p-0'>
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Tìm nhà cung cấp..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {filteredProviders.length === 0 && (
              <CommandEmpty>Không tìm thấy nhà cung cấp.</CommandEmpty>
            )}
            
            {Object.entries(groupedProviders).map(([type, providerList]) => (
              <CommandGroup key={type} heading={providerTypeLabels[type as keyof typeof providerTypeLabels]}>
                {providerList.map((provider) => (
                  <CommandItem
                    key={provider.id}
                    value={provider.id}
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
                        value === provider.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col gap-1">
                      <span className="font-medium line-clamp-1 ">{provider.name}</span>
                        <Separator className='min-w-full bg-gray-950 h-1' />
                      <div className="flex flex-col text-xs gap-1 text-muted-foreground">
                        <span>SĐT : {provider.telephone} </span>
                        {provider.taxCode && (
                          <>
                            <span>MST: {provider.taxCode}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}