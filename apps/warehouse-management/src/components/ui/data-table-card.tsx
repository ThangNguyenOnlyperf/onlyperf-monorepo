'use client';

import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';

interface DataTableCardProps {
  title: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function DataTableCard({ title, children, action, className = '' }: DataTableCardProps) {
  return (
    <Card className={`card-shadow border-charcoal-500/10 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
        {action && <div>{action}</div>}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}
