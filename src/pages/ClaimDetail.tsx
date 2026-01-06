import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getExecution } from '@/api/rules';
import { ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ClaimDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['execution', id],
    queryFn: () => getExecution(id as string),
    enabled: !!id,
  });

  return (
    <MainLayout>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <span className="hover:text-foreground cursor-pointer" onClick={() => navigate(-1)}>
          Back
        </span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-primary font-medium">Claim Detail</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Claim Detail</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {data?.executedAt || ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>Close</Button>
        </div>
      </div>

      {isLoading && <div>Loading...</div>}
      {error && <div>Error loading claim</div>}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Claim ID</div>
                  <div className="font-medium">{data.claimId}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Decision</div>
                  <div className="font-medium capitalize">{data.decision}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Amount</div>
                  <div className="font-medium">${(data.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Severity</div>
                  <div
                    className={cn(
                      'inline-block px-2 py-0.5 rounded text-xs font-medium uppercase',
                      data.severity === 'high' && 'bg-destructive text-destructive-foreground',
                      data.severity === 'medium' && 'bg-warning text-warning-foreground',
                      data.severity === 'low' && 'bg-success text-success-foreground'
                    )}
                  >
                    {data.severity}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-muted-foreground uppercase">Trigger Reasons</div>
                <div className="text-sm">{(data.triggerReasons || []).join(', ') || '—'}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payload</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted/50 p-3 rounded overflow-auto max-h-[320px]">
                {JSON.stringify(data.inputPayload || {}, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </MainLayout>
  );
}
