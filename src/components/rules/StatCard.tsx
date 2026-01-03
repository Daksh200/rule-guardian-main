import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
  subtitle?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconBgColor,
  iconColor,
  subtitle,
  className,
}: StatCardProps) {
  return (
    <div className={cn('stat-card flex items-center gap-4', className)}>
      <div className={cn('stat-card-icon', iconBgColor)}>
        <Icon className={cn('w-6 h-6', iconColor)} />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-foreground">{value}</span>
          {subtitle && <span className="text-sm text-muted-foreground">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}
