'use client';

import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';

interface FilterCardProps {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function FilterCard({ title, children, className = '' }: FilterCardProps) {
  return (
    <Card className={`glass-effect card-shadow border-charcoal-500/10 ${className}`}>
      {title && (
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? 'pt-0' : ''}>{children}</CardContent>
    </Card>
  );
}
