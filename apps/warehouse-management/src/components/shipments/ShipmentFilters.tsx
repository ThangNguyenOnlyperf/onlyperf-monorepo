'use client';

import { useState } from 'react';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import { Calendar } from '~/components/ui/calendar';
import { CalendarIcon, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { ShipmentFilters } from '~/actions/shipmentActions';

interface ShipmentFiltersProps {
  onFiltersChange: (filters: ShipmentFilters) => void;
}

export default function ShipmentFilters({ onFiltersChange }: ShipmentFiltersProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const handleSearch = () => {
    const filters: ShipmentFilters = {
      search: search.trim() || undefined,
      status: status !== 'all' ? status : undefined,
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
    };
    onFiltersChange(filters);
  };

  const handleReset = () => {
    setSearch('');
    setStatus('all');
    setStartDate(undefined);
    setEndDate(undefined);
    onFiltersChange({});
  };

  const hasFilters = search || status !== 'all' || startDate || endDate;

  return (
    <div className="flex flex-wrap items-end gap-4">
      {/* Search Input */}
      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="search" className="sr-only">
          Tìm kiếm
        </Label>
        <Input
          id="search"
          placeholder="Tìm theo số phiếu hoặc nhà cung cấp..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="max-w-sm"
        />
      </div>

      {/* Status Filter */}
      <div>
        <Label htmlFor="status" className="sr-only">
          Trạng thái
        </Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger id="status" className="w-[150px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="pending">Đang chờ</SelectItem>
            <SelectItem value="received">Đã nhận</SelectItem>
            <SelectItem value="completed">Hoàn thành</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Start Date */}
      <div>
        <Label htmlFor="startDate" className="sr-only">
          Từ ngày
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="startDate"
              variant="outline"
              className="w-[150px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, 'dd/MM/yyyy', { locale: vi }) : 'Từ ngày'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={setStartDate}
              locale={vi}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* End Date */}
      <div>
        <Label htmlFor="endDate" className="sr-only">
          Đến ngày
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="endDate"
              variant="outline"
              className="w-[150px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, 'dd/MM/yyyy', { locale: vi }) : 'Đến ngày'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={setEndDate}
              locale={vi}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleSearch} size="sm">
          <Search className="h-4 w-4 mr-2" />
          Tìm kiếm
        </Button>
        {hasFilters && (
          <Button onClick={handleReset} variant="ghost" size="sm">
            <X className="h-4 w-4 mr-2" />
            Xóa bộ lọc
          </Button>
        )}
      </div>
    </div>
  );
}