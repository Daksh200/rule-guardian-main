import { useState } from 'react';
import { Pencil, Trash2, Clock } from 'lucide-react';
import { FraudRule, RuleStatus } from '@/types/fraud';
import { CategoryBadge, SeverityBadge } from './Badges';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface RulesTableProps {
  rules: FraudRule[];
  onEdit: (rule: FraudRule) => void;
  onDelete: (rule: FraudRule) => void;
  onStatusChange: (rule: FraudRule, status: RuleStatus) => void;
}

export function RulesTable({ rules, onEdit, onDelete, onStatusChange }: RulesTableProps) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="font-semibold text-xs uppercase tracking-wide">Rule Name</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wide">Category</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wide">Severity</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wide text-center">Triggers (24h)</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wide">Last Updated</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wide">Status</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wide text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule, index) => (
            <TableRow
              key={rule.id}
              className={cn(
                'transition-colors',
                index % 2 === 0 ? 'bg-card' : 'bg-muted/30'
              )}
            >
              <TableCell className="py-4">
                <div>
                  <p className="font-medium text-foreground">{rule.name}</p>
                  {rule.conditionSummary && (
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground font-mono">
                        {rule.conditionSummary.split(' ')[0]}
                      </code>
                      <span className="text-xs text-muted-foreground">
                        {rule.conditionSummary.split(' ').slice(1).join(' ')}
                      </span>
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <CategoryBadge category={rule.category} />
              </TableCell>
              <TableCell>
                <SeverityBadge severity={rule.severity} delta={rule.triggerDelta} />
              </TableCell>
              <TableCell className="text-center font-medium">{rule.triggers24h}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  <Clock className="w-3.5 h-3.5" />
                  {rule.lastUpdated}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {rule.status === 'draft' ? (
                    <Button
                      size="sm"
                      onClick={() => onStatusChange(rule, 'active')}
                      className="text-xs"
                    >
                      Publish
                    </Button>
                  ) : (
                    <Switch
                      checked={rule.status === 'active'}
                      onCheckedChange={(checked) =>
                        onStatusChange(rule, checked ? 'active' : 'inactive')
                      }
                    />
                  )}
                  <span
                    className={cn(
                      'text-sm font-medium',
                      rule.status === 'active' ? 'text-success' : 'text-muted-foreground'
                    )}
                  >
                    {rule.status === 'active' ? 'Active' : rule.status === 'draft' ? 'Draft' : 'Inactive'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(rule)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(rule)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
