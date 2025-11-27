'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '~/lib/utils';
import { toast } from 'sonner';
import {
  Package,
  FileText,
  ShoppingCart,
  Home,
  Users,
  Truck,
  PackageOpen,
  Plus,
  ChevronLeft,
  BarChart3,
  PackageCheck,
  FileSpreadsheet,
  Settings,
  TrendingUp,
  Shield,
  ScanLine,
  QrCode,
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { useState, useEffect } from 'react';
import { useSession } from "~/lib/auth-client";
import InboundScanSheet from '~/components/scanner/InboundScanSheet';
import { getStoragesAction, type Storage } from '~/actions/storageActions';
import { Separator } from '~/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip';
import { usePendingFulfillments } from '~/hooks/usePendingFulfillments';
import { showNewOrderNotification } from '~/components/notifications/OrderNotification';

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
  shortcut?: string;
}

// Function to get navigation groups with dynamic badge count
const getNavigationGroups = (pendingCount: number): NavigationGroup[] => [
  {
    label: 'Nhập kho',
    items: [
      {
        name: 'Phiếu nhập',
        href: '/shipments',
        icon: FileText,
      },
      {
        name: 'Tạo phiếu mới',
        href: '/shipments/new',
        icon: Plus,
        shortcut: 'N',
      },
    ],
  },
  {
    label: 'Xuất kho',
    items: [
      {
        name: 'Đơn hàng',
        href: '/orders',
        icon: ShoppingCart,
      },
      {
        name: 'Xử lý đơn Shopify',
        href: '/fulfillment',
        icon: QrCode,
        badge: pendingCount > 0 ? String(pendingCount) : undefined,
      },
      {
        name: 'Xuất kho',
        href: '/outbound',
        icon: PackageOpen,
      },
      {
        name: 'Giao hàng',
        href: '/deliveries',
        icon: Truck,
      },
    ],
  },
  {
    label: 'Quản lý',
    items: [
      {
        name: 'Sản phẩm',
        href: '/products',
        icon: Package,
      },
      {
        name: 'Kho hàng',
        href: '/storages',
        icon: Home,
      },
      {
        name: 'Khách hàng',
        href: '/customers',
        icon: Users,
      },
    ],
  },
  {
    label: 'Báo cáo',
    items: [
      {
        name: 'Theo dõi sản phẩm',
        href: '/reports/products',
        icon: Package,
      },
      {
        name: 'Báo cáo tồn kho',
        href: '/reports/inventory',
        icon: BarChart3,
      },
      {
        name: 'Báo cáo bán hàng',
        href: '/reports/sales',
        icon: TrendingUp,
      },
      {
        name: 'Báo cáo nhập hàng',
        href: '/reports/shipments',
        icon: Truck,
      },
      {
        name: 'Quản lý bảo hành',
        href: '/reports/warranty',
        icon: Shield,
      },
    ],
  },
];

const quickActions = [
  {
    name: 'Quét QR',
    href: '#quet-qr',
    icon: ScanLine,
    variant: 'outline' as const,
    action: 'scan',
  },
];

// Get initial collapsed state from localStorage (client-side only)
const getInitialCollapsedState = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      return JSON.parse(saved);
    }
  }
  return false;
};

interface GlobalSidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export default function GlobalSidebar({ isMobileOpen, setIsMobileOpen }: GlobalSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsedState);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [storages, setStorages] = useState<Storage[]>([]);
  const [isLoadingStorages, setIsLoadingStorages] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  // Use React Query to poll for pending fulfillments
  const { count: pendingCount } = usePendingFulfillments({
    enabled: true,
    refetchInterval: 30000, // Poll every 30 seconds
    onNewOrders: (newOrders) => {
      // Show notification when new orders arrive with client-side navigation
      showNewOrderNotification(newOrders, () => router.push('/fulfillment'));
    },
  });

  // Get navigation groups with current pending count
  const navigationGroups = getNavigationGroups(pendingCount);

  // Load storages and mark as mounted
  useEffect(() => {
    setIsMounted(true);
    void loadStorages();
  }, []);

  const loadStorages = async () => {
    setIsLoadingStorages(true);
    const result = await getStoragesAction();
    if (result.success && result.data) {
      setStorages(result.data.data);
    }
    setIsLoadingStorages(false);
  };

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, setIsMobileOpen]);

  // Check if a path is active
  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:sticky top-0 left-0 z-50 h-screen bg-card border-r flex flex-col",
          isCollapsed ? "w-[70px]" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          isMounted && "transition-all duration-300"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-3">
          {!isCollapsed ? (
            <Link href="/" className="flex items-center gap-2 group">
              <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Perf
              </span>
            </Link>
          ) : (
            <Link href="/" className="flex justify-center w-full">
              <div className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
                <Package className="h-5 w-5 text-primary" />
              </div>
            </Link>
          )}
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex flex-shrink-0"
              onClick={toggleCollapsed}
            >
              <ChevronLeft className="h-4 w-4 transition-transform" />
            </Button>
          )}
        </div>
        
        {/* Collapse button for collapsed state */}
        {isCollapsed && (
          <div className="flex justify-center px-3 py-2 border-b">
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              onClick={toggleCollapsed}
            >
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </Button>
          </div>
        )}

        {/* Quick Actions */}
        {quickActions.length > 0 && (
          <div className="p-3 border-b space-y-2">
            {!isCollapsed ? (
              quickActions.map((action) => {
                const Icon = action.icon;
                if (action.action === 'scan') {
                  return (
                    <Button
                      key={action.name}
                      variant={action.variant}
                      className="w-full justify-start"
                      size="sm"
                      onClick={async () => {
                        await loadStorages();
                        if (storages.length === 0) {
                          toast.error('Vui lòng tạo kho trước khi quét hàng');
                          return;
                        }
                        setIsScanOpen(true);
                      }}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {action.name}
                    </Button>
                  );
                }
                return (
                  <Link key={action.href} href={action.href}>
                    <Button
                      variant={action.variant}
                      className="w-full justify-start"
                      size="sm"
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {action.name}
                    </Button>
                  </Link>
                );
              })
            ) : (
              <div className="space-y-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  const button = (
                    <Button
                      variant={action.variant}
                      className="w-full"
                      size="icon"
                      onClick={async () => {
                        if (action.action === 'scan') {
                          await loadStorages();
                          if (storages.length === 0) {
                            toast.error('Vui lòng tạo kho trước khi quét hàng');
                            return;
                          }
                          setIsScanOpen(true);
                        } else {
                          window.location.href = action.href;
                        }
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  );
                  
                  return (
                    <Tooltip key={action.name}>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent side="right">{action.name}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {navigationGroups.map((group, groupIndex) => (
            <div key={group.label}>
              {!isCollapsed && (
                <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </h3>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const linkContent = (
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all group",
                        "hover:bg-accent hover:text-accent-foreground",
                        active && "bg-primary/10 text-primary font-medium",
                        !active && "text-muted-foreground",
                        isCollapsed && "justify-center px-2"
                      )}
                      onClick={() => setIsMobileOpen(false)}
                    >
                      <Icon
                        className={cn(
                          "flex-shrink-0 transition-transform group-hover:scale-110",
                          isCollapsed ? "h-5 w-5" : "h-4 w-4"
                        )}
                      />
                      {!isCollapsed && (
                        <span className="flex-1">{item.name}</span>
                      )}
                      {!isCollapsed && item.badge && (
                        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {item.badge}
                        </span>
                      )}
                      {!isCollapsed && item.shortcut && (
                        <kbd className="ml-auto hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                          <span className="text-xs">⌘</span>
                          {item.shortcut}
                        </kbd>
                      )}
                    </Link>
                  );

                  if (isCollapsed) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent side="right" className="flex items-center gap-2">
                          {item.name}
                          {item.badge && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                              {item.badge}
                            </span>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return (
                    <span key={item.href} className="block">
                      {linkContent}
                    </span>
                  );
                })}

                {isAdmin && group.label === 'Quản lý' && (
                  isCollapsed ? (
                    <Tooltip key="/admin/users">
                      <TooltipTrigger asChild>
                        <Link
                          href="/admin/users"
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-2 py-2 text-sm justify-center",
                            isActive('/admin/users') ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                          onClick={() => setIsMobileOpen(false)}
                        >
                          <Users className="h-5 w-5" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        Quản lý người dùng
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span key="/admin/users" className="block">
                      <Link
                        href="/admin/users"
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all group",
                          "hover:bg-accent hover:text-accent-foreground",
                          isActive('/admin/users') && "bg-primary/10 text-primary font-medium",
                          !isActive('/admin/users') && "text-muted-foreground"
                        )}
                        onClick={() => setIsMobileOpen(false)}
                      >
                        <Users className="h-4 w-4" />
                        <span className="flex-1">Quản lý người dùng</span>
                      </Link>
                    </span>
                  )
                )}
              </div>
              {groupIndex < navigationGroups.length - 1 && (
                <Separator className="mt-3" />
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t p-3">
          {!isCollapsed ? (
            <Link href="/settings">
              <Button variant="ghost" className="w-full justify-start" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Cài đặt
              </Button>
            </Link>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/settings">
                  <Button variant="ghost" className="w-full" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Cài đặt</TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>

      {/* Scanner Sheet */}
      <InboundScanSheet
        open={isScanOpen}
        onOpenChange={setIsScanOpen}
        storages={storages}
        onScanComplete={() => {
          window.location.reload();
        }}
      />
    </TooltipProvider>
  );
}
