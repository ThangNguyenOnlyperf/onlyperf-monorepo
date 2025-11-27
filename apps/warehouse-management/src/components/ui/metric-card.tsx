'use client';

import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';

interface MetricCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: ReactNode;
  variant?: 'primary' | 'cyan' | 'amber' | 'emerald' | 'blue' | 'purple' | 'pink';
  className?: string;
}

const variantStyles = {
  primary: 'bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border-cyan-500/20 text-cyan-700',
  cyan: 'bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border-cyan-500/20 text-cyan-700',
  amber: 'bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/20 text-amber-700',
  emerald: 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border-emerald-500/20 text-emerald-700',
  blue: 'bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20 text-blue-700',
  purple: 'bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20 text-purple-700',
  pink: 'bg-gradient-to-br from-pink-500/10 to-pink-600/10 border-pink-500/20 text-pink-700',
};

const iconBackgroundVariants = {
  primary: 'bg-cyan-500/15 text-cyan-600',
  cyan: 'bg-cyan-500/15 text-cyan-600',
  amber: 'bg-amber-500/15 text-amber-600',
  emerald: 'bg-emerald-500/15 text-emerald-600',
  blue: 'bg-blue-500/15 text-blue-600',
  purple: 'bg-purple-500/15 text-purple-600',
  pink: 'bg-pink-500/15 text-pink-600',
};

export function MetricCard({
  title,
  value,
  description,
  icon,
  variant = 'cyan',
  className = '',
}: MetricCardProps) {
  return (
    <Card className={`border ${variantStyles[variant]} card-shadow ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold text-foreground/80">{title}</CardTitle>
        <div className={`p-2.5 rounded-lg ${iconBackgroundVariants[variant]}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
