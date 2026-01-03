import { cn } from '@/lib/utils';
import { RuleCategory, Severity } from '@/types/fraud';
import { User, CreditCard, MapPin, FileText } from 'lucide-react';

interface CategoryBadgeProps {
  category: RuleCategory;
  className?: string;
}

const categoryConfig = {
  identity: {
    label: 'Identity',
    icon: User,
    className: 'category-identity',
  },
  transaction: {
    label: 'Transaction',
    icon: CreditCard,
    className: 'category-transaction',
  },
  geolocation: {
    label: 'Geolocation',
    icon: MapPin,
    className: 'category-geolocation',
  },
  document: {
    label: 'Document',
    icon: FileText,
    className: 'category-document',
  },
};

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const config = categoryConfig[category];
  const Icon = config.icon;

  return (
    <span className={cn('category-badge', config.className, className)}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

interface SeverityBadgeProps {
  severity: Severity;
  delta?: number;
  className?: string;
}

export function SeverityBadge({ severity, delta, className }: SeverityBadgeProps) {
  const severityConfig = {
    high: 'severity-high',
    medium: 'severity-medium',
    low: 'severity-low',
  };

  return (
    <span className={cn('severity-badge', severityConfig[severity], className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      <span className="capitalize">{severity}</span>
      {delta !== undefined && <span>(+{delta})</span>}
    </span>
  );
}

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'draft';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    active: 'bg-success/10 text-success border-success/20',
    inactive: 'bg-muted text-muted-foreground border-border',
    draft: 'bg-warning/10 text-warning border-warning/20',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        statusConfig[status],
        className
      )}
    >
      {status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5" />}
      <span className="capitalize">{status}</span>
    </span>
  );
}
