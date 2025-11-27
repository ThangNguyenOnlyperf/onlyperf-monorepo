'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, Phone, User, MapPin } from 'lucide-react';
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
import type { Customer } from '~/actions/customersAction';

interface CustomerPhoneComboboxProps {
  customers: Customer[];
  value?: string;
  onValueChange: (value: string) => void;
  onCustomerSelect: (customer: Customer) => void;
  onCreateNew?: () => void;
  disabled?: boolean;
}

export default function CustomerPhoneCombobox({
  customers,
  value,
  onValueChange,
  onCustomerSelect,
  onCreateNew,
  disabled = false,
}: CustomerPhoneComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    if (value) {
      setSearchValue(value);
    }
  }, [value]);

  const filteredCustomers = searchValue
    ? customers.filter((customer) =>
        customer.phone.includes(searchValue)
      )
    : customers;

  const exactMatch = customers.some(
    (customer) => customer.phone === searchValue
  );

  const selectedCustomer = customers.find((customer) => customer.phone === value);

  const handleCustomerSelect = (customer: Customer) => {
    onValueChange(customer.phone);
    onCustomerSelect(customer);
    setOpen(false);
    setSearchValue(customer.phone);
  };

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew();
    }
    setOpen(false);
  };

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
            {selectedCustomer ? selectedCustomer.phone : (searchValue || 'Tìm kiếm bằng số điện thoại...')}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] sm:w-[500px] lg:w-[350px] p-0">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Tìm khách hàng bằng số điện thoại..." 
            value={searchValue}
            onValueChange={(value) => {
              setSearchValue(value);
              onValueChange(value);
            }}
          />
          <CommandList>
            {filteredCustomers.length === 0 && !searchValue && (
              <CommandEmpty>Chưa có khách hàng nào.</CommandEmpty>
            )}
            
            {searchValue && !exactMatch && (
              <CommandGroup heading="Tạo mới">
                <CommandItem
                  onSelect={handleCreateNew}
                  disabled={disabled}
                  className="cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm khách hàng mới với SĐT "{searchValue}"
                </CommandItem>
              </CommandGroup>
            )}

            {filteredCustomers.length > 0 && (
              <CommandGroup heading="Khách hàng có sẵn">
                {filteredCustomers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={customer.phone}
                    onSelect={() => handleCustomerSelect(customer)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === customer.phone ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{customer.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{customer.name}</span>
                      </div>
                    </div>
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