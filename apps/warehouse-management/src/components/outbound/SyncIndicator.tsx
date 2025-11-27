'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudOff, Smartphone, Monitor, RefreshCw } from 'lucide-react';
import { cn } from '~/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip';

interface SyncIndicatorProps {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncTime?: Date;
  deviceCount?: number;
  className?: string;
}

export default function SyncIndicator({
  isConnected,
  isSyncing,
  lastSyncTime,
  deviceCount = 1,
  className,
}: SyncIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    if (!lastSyncTime) return;

    const updateTimeAgo = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - lastSyncTime.getTime()) / 1000);

      if (diff < 5) {
        setTimeAgo('vừa xong');
      } else if (diff < 60) {
        setTimeAgo(`${diff} giây trước`);
      } else if (diff < 3600) {
        setTimeAgo(`${Math.floor(diff / 60)} phút trước`);
      } else {
        setTimeAgo('lâu rồi');
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 5000);

    return () => clearInterval(interval);
  }, [lastSyncTime]);

  const getStatusColor = () => {
    if (!isConnected) return 'text-muted-foreground';
    if (isSyncing) return 'text-blue-600';
    return 'text-emerald-600';
  };

  const getStatusIcon = () => {
    if (!isConnected) return <CloudOff className="h-4 w-4" />;
    if (isSyncing) return <RefreshCw className="h-4 w-4 animate-spin" />;
    return <Cloud className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (!isConnected) return 'Ngoại tuyến';
    if (isSyncing) return 'Đang đồng bộ...';
    return 'Đã đồng bộ';
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border bg-background/50 px-3 py-2 backdrop-blur-sm transition-all',
          isConnected ? 'border-emerald-500/20' : 'border-muted',
          className
        )}
      >
        {/* Sync Status */}
        <div className="flex items-center gap-2">
          <div className={cn('transition-colors', getStatusColor())}>
            {getStatusIcon()}
          </div>
          <div className="flex flex-col">
            <span className={cn('text-xs font-medium', getStatusColor())}>
              {getStatusText()}
            </span>
            {lastSyncTime && isConnected && (
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
            )}
          </div>
        </div>

        {/* Device Count */}
        {isConnected && deviceCount > 1 && (
          <>
            <div className="h-4 w-px bg-border" />
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center">
                    <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                    <Smartphone className="h-3.5 w-3.5 -ml-1 text-muted-foreground" />
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    {deviceCount} thiết bị
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Đang kết nối từ {deviceCount} thiết bị</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}

        {/* Connection Indicator */}
        <div className="ml-auto">
          <div
            className={cn(
              'h-2 w-2 rounded-full',
              isConnected
                ? isSyncing
                  ? 'animate-pulse bg-blue-500'
                  : 'bg-emerald-500'
                : 'bg-muted-foreground'
            )}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}