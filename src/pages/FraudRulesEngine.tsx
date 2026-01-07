import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, History, Layers, FileText, Bell, BarChart3, Filter, ArrowUpDown } from 'lucide-react';
import { AuditLogDrawer } from '@/components/audit/AuditLogDrawer';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/rules/StatCard';
import { RulesTable } from '@/components/rules/RulesTable';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { categoryOptions } from '@/data/mockData';
import { FraudRule, RuleStatus } from '@/types/fraud';
import { useToast } from '@/hooks/use-toast';
import { getRules, updateRuleStatus, deleteRule } from '@/api/rules';

type FilterTab = 'all' | 'active' | 'inactive' | 'draft';

export default function FraudRulesEngine() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [auditOpen, setAuditOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'nameAsc'|'nameDesc'|'updatedDesc'|'updatedAsc'>('updatedDesc');

  const { data: rules = [], isLoading, error } = useQuery({
    queryKey: ['rules'],
    queryFn: getRules,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RuleStatus }) =>
      updateRuleStatus(id, status),
    onSuccess: (updatedRule) => {
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      toast({
        title: 'Status Updated',
        description: `${updatedRule.name} is now ${updatedRule.status}.`,
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update rule status.',
        variant: 'destructive',
      });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: deleteRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      toast({
        title: 'Rule Deleted',
        description: 'Rule has been deleted successfully.',
        variant: 'destructive',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete rule.',
        variant: 'destructive',
      });
    },
  });

  const stats = useMemo(() => ({
    activeRules: rules.filter((r) => r.status === 'active').length,
    drafts: rules.filter((r) => r.status === 'draft').length,
    inactiveRules: rules.filter((r) => r.status === 'inactive').length,
    triggered24h: rules.reduce((sum, r) => sum + (r.triggers24h || 0), 0),
    avgFraudScore: 'N/A',
  }), [rules]);

  const filteredRules = useMemo(() => {
    const base = rules.filter((rule) => {
      const tabMatch =
        activeTab === 'all' ||
        (activeTab === 'active' && rule.status === 'active') ||
        (activeTab === 'inactive' && rule.status === 'inactive') ||
        (activeTab === 'draft' && rule.status === 'draft');
      const categoryMatch = categoryFilter === 'all' || rule.category === categoryFilter;
      return tabMatch && categoryMatch;
    });
    const sorted = [...base].sort((a, b) => {
      switch (sortBy) {
        case 'nameAsc': return a.name.localeCompare(b.name);
        case 'nameDesc': return b.name.localeCompare(a.name);
        case 'updatedAsc': return new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
        case 'updatedDesc':
        default: return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      }
    });
    return sorted;
  }, [rules, activeTab, categoryFilter, sortBy]);

  const handleStatusChange = (rule: FraudRule, status: RuleStatus) => {
    updateStatusMutation.mutate({ id: rule.id, status });
  };

  const handleEdit = (rule: FraudRule) => {
    navigate(`/rules/${rule.id}/edit`);
  };

  const handleDelete = (rule: FraudRule) => {
    deleteRuleMutation.mutate(rule.id);
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading rules</div>;

  return (
    <MainLayout>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">Fraud Rules Engine</h1>
          <p className="text-muted-foreground">
            Configure detection logic, set risk thresholds, and manage active system rules.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={() => setAuditOpen(true)}>
            <History className="w-4 h-4" />
            Audit Log
          </Button>
          <Button onClick={() => navigate('/rules/create')} className="gap-2">
            <Plus className="w-4 h-4" />
            Create New Rule
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active Rules"
          value={stats.activeRules}
          icon={Layers}
          iconBgColor="bg-primary/10"
          iconColor="text-primary"
        />
        <StatCard
          label="Drafts"
          value={stats.drafts}
          icon={FileText}
          iconBgColor="bg-muted"
          iconColor="text-muted-foreground"
        />
        <StatCard
          label="Triggered (24h)"
          value={stats.triggered24h.toLocaleString()}
          icon={Bell}
          iconBgColor="bg-destructive/10"
          iconColor="text-destructive"
        />
        <StatCard
          label="Inactive Rules"
          value={stats.inactiveRules}
          icon={History}
          iconBgColor="bg-muted"
          iconColor="text-muted-foreground"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all">All Rules</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
            <TabsTrigger value="draft">Drafts</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40 bg-card">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Category: All</SelectItem>
              {categoryOptions.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowUpDown className="w-4 h-4" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy('updatedDesc')}>Last Updated: Newest</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('updatedAsc')}>Last Updated: Oldest</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('nameAsc')}>Name: A → Z</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('nameDesc')}>Name: Z → A</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Rules Table */}
      <RulesTable
        rules={filteredRules}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
      />
    <AuditLogDrawer open={auditOpen} onOpenChange={setAuditOpen} />
    </MainLayout>
  );
}
