'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, User, LogOut, Settings, ChevronRight, Home, Menu, X, Building2, Check } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '~/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { useSession, signOut } from "~/lib/auth-client";
import { getUserOrganizationsAction, switchOrganizationAction, type UserOrganization } from '~/actions/organizationActions';
import { toast } from 'sonner';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";

interface TopNavigationBarProps {
  onSearchOpen: () => void;
  onMenuClick: () => void;
  isSidebarOpen: boolean;
}

export default function TopNavigationBar({ onSearchOpen, onMenuClick, isSidebarOpen }: TopNavigationBarProps) {
  const [isMac, setIsMac] = useState(false);
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [isSwitching, startTransition] = useTransition();
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().includes('MAC'));
  }, []);

  // Fetch user's organizations
  useEffect(() => {
    if (session?.user) {
      getUserOrganizationsAction().then((result) => {
        if (result.success && result.data) {
          setOrganizations(result.data);
        }
      });
    }
  }, [session?.user]);

  const activeOrg = organizations.find((org) => org.isActive);

  const handleSwitchOrg = (orgId: string) => {
    if (orgId === activeOrg?.id) return;

    startTransition(async () => {
      const result = await switchOrganizationAction(orgId);
      if (result.success) {
        toast.success(result.message);
        // Refresh page to reload all data with new org context
        router.refresh();
        window.location.reload();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/signin");
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate breadcrumb items based on pathname
  const getBreadcrumbs = () => {
    if (pathname === '/') return null;
    
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbNames: Record<string, string> = {
      'shipments': 'Phiếu nhập',
      'orders': 'Đơn hàng',
      'products': 'Sản phẩm',
      'storages': 'Kho hàng',
      'customers': 'Khách hàng',
      'deliveries': 'Giao hàng',
      'outbound': 'Xuất kho',
      'reports': 'Báo cáo',
      'new': 'Tạo mới',
      'pdf': 'PDF',
      'scan': 'Quét mã',
    };
    
    return paths.map((path, index) => ({
      name: breadcrumbNames[path] || path,
      href: '/' + paths.slice(0, index + 1).join('/'),
      isLast: index === paths.length - 1,
    }));
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="flex h-16 items-center justify-between px-4">
        {/* Mobile menu button and Breadcrumbs */}
        <div className="flex items-center gap-2 flex-1">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden flex-shrink-0"
            onClick={onMenuClick}
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/" className="flex items-center gap-1 hover:text-primary transition-colors">
                    <Home className="h-3.5 w-3.5" />
                    <span className="sr-only">Trang chủ</span>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-3.5 w-3.5" />
                </BreadcrumbSeparator>
                {breadcrumbs.map((item, index) => (
                  <div key={item.href} className="flex items-center gap-1.5">
                    <BreadcrumbItem>
                      {item.isLast ? (
                        <BreadcrumbPage className="font-medium">
                          {item.name}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink 
                          href={item.href} 
                          className="hover:text-primary transition-colors"
                        >
                          {item.name}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {index < breadcrumbs.length - 1 && (
                      <BreadcrumbSeparator>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </BreadcrumbSeparator>
                    )}
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}
        </div>

        {/* Search and User */}
        <div className="flex items-center gap-2">
          {/* Search Trigger */}
          <Button
            variant="outline"
            size="default"
            onClick={onSearchOpen}
            className="relative h-10 w-10 p-0 sm:w-auto sm:px-4 md:w-48 lg:w-48 justify-start glass-effect border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all group"
          >
            <Search className="h-5 w-5 sm:mr-2 text-primary/70 group-hover:text-primary transition-colors" />
            <span className="hidden sm:inline-flex text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              Tìm kiếm
            </span>
            <span className="sr-only">Tìm kiếm</span>
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-6 select-none items-center gap-1 rounded border bg-primary/10 border-primary/20 px-1.5 font-mono text-xs font-medium opacity-100 md:flex">
              <span className="text-xs">{isMac ? '⌘' : 'Ctrl'}</span>K
            </kbd>
          </Button>

          {/* User Dropdown */}
          {session && !isPending && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={session.user.image ?? undefined} alt={session.user.name} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                      {getUserInitials(session.user.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{session.user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session.user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Organization Selector */}
                {organizations.length > 0 && (
                  <>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger disabled={isSwitching}>
                        <Building2 className="mr-2 h-4 w-4" />
                        <span className="flex-1 truncate">
                          {activeOrg?.name ?? 'Chọn tổ chức'}
                        </span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-56">
                        <DropdownMenuRadioGroup value={activeOrg?.id} onValueChange={handleSwitchOrg}>
                          {organizations.map((org) => (
                            <DropdownMenuRadioItem
                              key={org.id}
                              value={org.id}
                              disabled={isSwitching}
                              className="cursor-pointer"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{org.name}</span>
                                <span className="text-xs text-muted-foreground capitalize">{org.role}</span>
                              </div>
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Thông tin tài khoản</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Cài đặt</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Đăng xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}