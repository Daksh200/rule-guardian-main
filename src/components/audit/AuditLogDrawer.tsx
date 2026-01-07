import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { exportAuditLogs, getAuditLogs } from '@/api/audit';

const actionOptions = [
  'created_rule',
  'updated_rule',
  'deleted_rule',
  'status_changed',
  'published_version',
  'cloned_rule',
  'executed_rule',
  'tested_rule',
  'logged_in',
  'logged_out',
];

const entityOptions = ['rule', 'rule_version', 'execution', 'user'];

export function AuditLogDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [action, setAction] = useState<string>('');
  const [entityType, setEntityType] = useState<string>('');
  const [actorEmail, setActorEmail] = useState('');
  const [entityId, setEntityId] = useState('');
  const [dateRange, setDateRange] = useState<'24h'|'7d'|'30d'|'all'>('30d');

  const dateFilters = useMemo(() => {
    const now = new Date();
    let from: string | undefined;
    if (dateRange === '24h') {
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    } else if (dateRange === '7d') {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (dateRange === '30d') {
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
    return { date_from: from, date_to: undefined };
  }, [dateRange]);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, limit, action, entityType, actorEmail, entityId, dateFilters],
    queryFn: () => getAuditLogs({ page, limit, action: action || undefined, entity_type: entityType || undefined, actor_email: actorEmail || undefined, entity_id: entityId || undefined, ...dateFilters }),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl">
        <DialogHeader>
          <DialogTitle>Audit Log</DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-3">
          <Select value={dateRange} onValueChange={(v) => { setDateRange(v as any); setPage(1); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Last 30 days" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={action} onValueChange={(v) => { setAction(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actionOptions.map(a => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={entityType} onValueChange={(v) => { setEntityType(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Entity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              {entityOptions.map(e => (<SelectItem key={e} value={e}>{e}</SelectItem>))}
            </SelectContent>
          </Select>
          <Input value={actorEmail} onChange={(e) => setActorEmail(e.target.value)} placeholder="Actor email" className="h-9" />
          <Input value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="Entity ID" className="h-9" />
          <div className="flex items-center gap-2">
            <Button variant="outline" className="w-full" onClick={() => setPage(1)}>Apply</Button>
            <Button className="w-full" onClick={() => exportAuditLogs({ action, entity_type: entityType, actor_email: actorEmail, entity_id: entityId, ...dateFilters })}>Export CSV</Button>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-md max-h-[400px] overflow-auto">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Time</TableHead>
                <TableHead className="w-[200px]">Actor</TableHead>
                <TableHead className="w-[160px]">Action</TableHead>
                <TableHead className="w-[160px]">Entity</TableHead>
                <TableHead className="w-[220px]">Summary</TableHead>
                <TableHead className="w-[300px]">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow>
              )}
              {!isLoading && (data?.items || []).length === 0 && (
                <TableRow><TableCell colSpan={6}>No results</TableCell></TableRow>
              )}
              {(data?.items || []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap">{row.created_at ? new Date(row.created_at).toLocaleString() : ''}</TableCell>
                  <TableCell className="truncate">{row.actor_email || 'system'}</TableCell>
                  <TableCell className="uppercase text-xs break-words">{row.action}</TableCell>
                  <TableCell className="uppercase text-xs break-words">{row.entity_type}{row.entity_id ? `#${row.entity_id}` : ''}</TableCell>
                  <TableCell className="break-words">{row.entity_label || ''}</TableCell>
                  <TableCell className="truncate">
                    <pre className="text-xs bg-muted/40 rounded p-2 max-h-[120px] overflow-auto">{JSON.stringify(row.metadata || {}, null, 2)}</pre>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-3">
          <div className="text-sm text-muted-foreground">Total: {data?.total || 0}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <Button variant="outline" size="sm" disabled={((data?.items?.length || 0) < limit)} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
