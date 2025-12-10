import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import type { LucideIcon } from 'lucide-react';

export type StatCardColorScheme = 'emerald' | 'blue' | 'amber' | 'purple' | 'red' | 'slate';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  colorScheme: StatCardColorScheme;
}

const colorClasses: Record<StatCardColorScheme, { card: string; title: string; value: string; subtitle: string; icon: string }> = {
  emerald: {
    card: 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border-emerald-500/20',
    title: 'text-emerald-700',
    value: 'text-emerald-700',
    subtitle: 'text-emerald-600/80',
    icon: 'text-emerald-600',
  },
  blue: {
    card: 'bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20',
    title: 'text-blue-700',
    value: 'text-blue-700',
    subtitle: 'text-blue-600/80',
    icon: 'text-blue-600',
  },
  amber: {
    card: 'bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/20',
    title: 'text-amber-700',
    value: 'text-amber-700',
    subtitle: 'text-amber-600/80',
    icon: 'text-amber-600',
  },
  purple: {
    card: 'bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20',
    title: 'text-purple-700',
    value: 'text-purple-700',
    subtitle: 'text-purple-600/80',
    icon: 'text-purple-600',
  },
  red: {
    card: 'bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20',
    title: 'text-red-700',
    value: 'text-red-700',
    subtitle: 'text-red-600/80',
    icon: 'text-red-600',
  },
  slate: {
    card: 'bg-gradient-to-br from-slate-500/10 to-slate-600/10 border-slate-500/20',
    title: 'text-slate-700',
    value: 'text-slate-700',
    subtitle: 'text-slate-600/80',
    icon: 'text-slate-600',
  },
};

/**
 * A reusable stat card component with gradient background
 */
export function StatCard({ title, value, subtitle, icon: Icon, colorScheme }: StatCardProps) {
  const colors = colorClasses[colorScheme];

  const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <Card className={colors.card}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className={`text-sm font-medium ${colors.title}`}>{title}</CardTitle>
        <Icon className={`h-4 w-4 ${colors.icon}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${colors.value}`}>{formattedValue}</div>
        {subtitle && <p className={`text-xs ${colors.subtitle}`}>{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
