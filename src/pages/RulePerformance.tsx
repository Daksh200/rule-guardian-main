import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  Download,
  Pencil,
  Copy,
  FileText,
  Flag,
  CheckCircle,
  ShieldCheck,
  X,
  Check,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/rules/StatCard';
import { SeverityBadge, StatusBadge } from '@/components/rules/Badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { mockRulePerformance } from '@/data/mockData';
import { TriggeredClaim } from '@/types/fraud';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export default function RulePerformance() {
  const navigate = useNavigate();
  const [timePeriod, setTimePeriod] = useState<'30' | '90'>('30');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [decisionFilter, setDecisionFilter] = useState('all');
  
  const perf = mockRulePerformance;

  const pieData = [
    { name: 'High', value: perf.severityDistribution.high, color: 'hsl(0, 84%, 60%)' },
    { name: 'Med', value: perf.severityDistribution.medium, color: 'hsl(38, 92%, 50%)' },
    { name: 'Low', value: perf.severityDistribution.low, color: 'hsl(142, 76%, 36%)' },
  ];

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case 'fraud':
        return <X className="w-4 h-4 text-destructive" />;
      case 'legitimate':
        return <Check className="w-4 h-4 text-success" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getDecisionLabel = (decision: string) => {
    switch (decision) {
      case 'fraud':
        return <span className="text-destructive">Fraud</span>;
      case 'legitimate':
        return <span className="text-success">Legit</span>;
      default:
        return <span className="text-muted-foreground">Pending</span>;
    }
  };

  return (
    <MainLayout>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-foreground">
              Rule Performance — {perf.ruleName}
            </h1>
            <StatusBadge status="active" />
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Version: {perf.version}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Last Evaluated: {perf.lastEvaluated}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Eye className="w-4 h-4" />
            View Rule
          </Button>
          <Button className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Total Claims Evaluated
                </p>
                <p className="text-2xl font-bold">{perf.totalClaimsEvaluated.toLocaleString()}</p>
              </div>
            </div>
            <span className="absolute top-3 right-3 text-xs text-muted-foreground">
              Last 30 Days
            </span>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Flag className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Flags Triggered
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">{perf.flagsTriggered}</p>
                  <span className="text-sm text-muted-foreground">Matches</span>
                </div>
              </div>
            </div>
            <span className="absolute top-3 right-3 text-xs bg-warning/20 text-warning px-2 py-0.5 rounded">
              Hit Rate: {perf.hitRate}%
            </span>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Confirmed Fraud
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">{perf.confirmedFraud}</p>
                  <span className="text-sm text-muted-foreground">Cases</span>
                </div>
              </div>
            </div>
            <span className="absolute top-3 right-3 text-xs bg-success/20 text-success px-2 py-0.5 rounded">
              Validated
            </span>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  False Positive Rate
                </p>
                <p className="text-2xl font-bold">{perf.falsePositiveRate}%</p>
              </div>
            </div>
            <span className="absolute top-3 right-3 text-xs bg-success/20 text-success px-2 py-0.5 rounded">
              Good
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Trigger Trends Chart */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Trigger Trends</CardTitle>
              <p className="text-sm text-muted-foreground">
                Performance over the last {timePeriod} days
              </p>
            </div>
            <Tabs value={timePeriod} onValueChange={(v) => setTimePeriod(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="30" className="text-xs px-3 h-6">
                  30 Days
                </TabsTrigger>
                <TabsTrigger value="90" className="text-xs px-3 h-6">
                  90 Days
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={perf.triggerTrends.slice(0, parseInt(timePeriod))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="totalClaims"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  name="Total Claims"
                />
                <Line
                  type="monotone"
                  dataKey="flags"
                  stroke="hsl(var(--warning))"
                  strokeWidth={2}
                  dot={false}
                  name="Flags"
                />
                <Line
                  type="monotone"
                  dataKey="fraud"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Fraud"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-end gap-6 mt-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-primary" />
              <span className="text-xs text-muted-foreground">Total Claims</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-warning" />
              <span className="text-xs text-muted-foreground">Flags</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-destructive border-dashed" />
              <span className="text-xs text-muted-foreground">Fraud</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Condition Hit Map */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-primary">≡</span>
              Condition Hit Map
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {perf.conditionHitMap.map((item) => (
              <div key={item.condition} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.condition}</span>
                  <span className="font-medium text-primary">{item.percentage}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Severity Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-warning">+</span>
              Severity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-muted-foreground uppercase">Total</span>
                <span className="text-2xl font-bold">{perf.flagsTriggered}</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name} {item.value}%
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Analyst Decisions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-primary">✎</span>
              Analyst Decisions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-destructive/10 flex items-center justify-center">
                  <X className="w-4 h-4 text-destructive" />
                </div>
                <span className="text-sm">Marked as Fraud</span>
              </div>
              <span className="text-lg font-bold text-destructive">56</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-success/10 flex items-center justify-center">
                  <Check className="w-4 h-4 text-success" />
                </div>
                <span className="text-sm">Marked Legitimate</span>
              </div>
              <span className="text-lg font-bold text-success">80</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-sm">Review Pending</span>
              </div>
              <span className="text-lg font-bold">158</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Triggered Claims Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Triggered Claims</CardTitle>
              <p className="text-sm text-muted-foreground">
                Claims matching "{perf.ruleName}"
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={decisionFilter} onValueChange={setDecisionFilter}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="All Decisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Decisions</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="fraud">Fraud</SelectItem>
                  <SelectItem value="legitimate">Legitimate</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="30">
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase">Claim ID</TableHead>
                <TableHead className="text-xs uppercase">Date</TableHead>
                <TableHead className="text-xs uppercase">Severity</TableHead>
                <TableHead className="text-xs uppercase">Trigger Reasons</TableHead>
                <TableHead className="text-xs uppercase">Decision</TableHead>
                <TableHead className="text-xs uppercase text-right">Amount</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perf.triggeredClaims.map((claim: TriggeredClaim) => (
                <TableRow key={claim.id}>
                  <TableCell className="font-medium text-primary">{claim.claimId}</TableCell>
                  <TableCell className="text-muted-foreground">{claim.date}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium uppercase',
                        claim.severity === 'high' && 'bg-destructive text-destructive-foreground',
                        claim.severity === 'medium' && 'bg-warning text-warning-foreground',
                        claim.severity === 'low' && 'bg-success text-success-foreground'
                      )}
                    >
                      {claim.severity}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{claim.triggerReasons.join(', ')}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {getDecisionIcon(claim.decision)}
                      {getDecisionLabel(claim.decision)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ${claim.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="text-center pt-4">
            <Button variant="link" className="text-primary">
              View All Matches
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Actions Footer */}
      <div className="mt-6 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground uppercase">
          Actions for Current Rule
        </span>
        <div className="flex items-center gap-3">
          <Button variant="ghost">Close</Button>
          <Button variant="outline" className="gap-2">
            <Copy className="w-4 h-4" />
            Clone Rule
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Analytics
          </Button>
          <Button onClick={() => navigate('/rules/5/edit')} className="gap-2">
            <Pencil className="w-4 h-4" />
            Edit Rule
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
