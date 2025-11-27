'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import TopNavigationBar from './TopNavigationBar';
import GlobalSidebar from './GlobalSidebar';
import { useSearch } from '~/providers/SearchProvider';

interface LayoutContentProps {
  children: React.ReactNode;
}

export default function LayoutContent({ children }: LayoutContentProps) {
  const { openSearch } = useSearch();
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Hide sidebar on auth pages
  const isAuthPage = pathname === '/signin' || pathname === '/signup';
  
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background flex">
      <GlobalSidebar 
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavigationBar 
          onSearchOpen={openSearch}
          onMenuClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          isSidebarOpen={isMobileSidebarOpen}
        />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}