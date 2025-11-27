import { Search, Package, FileText, Home, BarChart3, ScanLine, Plus } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MobileNavigationContentProps {
  navigationItems: NavigationItem[];
  onNavigate: (href: string) => void;
  onSearchOpen: () => void;
}

export default function MobileNavigationContent({ 
  navigationItems, 
  onNavigate, 
  onSearchOpen 
}: MobileNavigationContentProps) {
  const quickActions = [
    { label: 'Quét QR', action: () => onNavigate('/scan'), icon: ScanLine, color: 'text-purple-600' },
    { label: 'Lô hàng mới', action: () => onNavigate('/shipments/new'), icon: Plus, color: 'text-blue-600' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center space-x-2 pb-4">
        <Package className="h-6 w-6" />
        <span className="font-bold">Quản lý kho</span>
      </div>

      {/* Search */}
      <Button
        variant="outline"
        onClick={onSearchOpen}
        className="w-full justify-start mb-4"
      >
        <Search className="mr-2 h-4 w-4" />
        Tìm kiếm...
        <kbd className="ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:flex">
          ⌘K
        </kbd>
      </Button>

      {/* Navigation Items */}
      <nav className="flex flex-col space-y-2 mb-6">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.href}
              variant="ghost"
              onClick={() => onNavigate(item.href)}
              className="w-full justify-start"
            >
              <Icon className="mr-2 h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      <Separator className="mb-4" />

      {/* Quick Actions */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground mb-2">
          Thao tác nhanh
        </h4>
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Button
              key={index}
              variant="ghost"
              onClick={action.action}
              className="w-full justify-start"
            >
              <Icon className={`mr-2 h-4 w-4 ${action.color}`} />
              {action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}