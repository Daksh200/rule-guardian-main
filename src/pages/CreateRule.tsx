import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Info, SlidersHorizontal, Lightbulb, FileText, FlaskConical } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { LogicBuilder } from '@/components/rules/LogicBuilder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ruleTypeOptions, severityOptions, admins } from '@/data/mockData';
import { ConditionGroup } from '@/types/fraud';
import { useToast } from '@/hooks/use-toast';

export default function CreateRule() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [ruleName, setRuleName] = useState('');
  const [description, setDescription] = useState('');
  const [ruleType, setRuleType] = useState('');
  const [severity, setSeverity] = useState('');
  const [owner, setOwner] = useState(admins[0].id);
  const [tags, setTags] = useState('');
  const [logicGroups, setLogicGroups] = useState<ConditionGroup[]>([
    {
      id: '1',
      logicOperator: 'IF',
      conditions: [{ id: '1', field: '', operator: 'greater', value: '' }],
    },
  ]);

  const generateRuleSummary = () => {
    if (!logicGroups[0]?.conditions[0]?.field) {
      return '(Start building your rule logic to see a natural language summary here. e.g. "If Claim Amount > 5000 AND Location != Home, THEN Flag as High Severity")';
    }
    
    const parts: string[] = [];
    logicGroups.forEach((group) => {
      group.conditions.forEach((cond) => {
        if (cond.field && cond.value) {
          parts.push(`${cond.field} ${cond.operator} ${cond.value}`);
        }
      });
    });
    
    return parts.length > 0
      ? `If ${parts.join(' AND ')}, THEN Flag as ${severity || 'Medium'} Severity`
      : '(Add conditions to see summary)';
  };

  const handleSaveDraft = () => {
    toast({
      title: 'Draft Saved',
      description: 'Your rule has been saved as a draft.',
    });
  };

  const handleTestRule = () => {
    toast({
      title: 'Testing Rule',
      description: 'Running rule against sample claims...',
    });
  };

  const handlePublish = () => {
    if (!ruleName || !ruleType || !severity) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }
    
    toast({
      title: 'Rule Published',
      description: `${ruleName} is now active.`,
    });
    navigate('/');
  };

  return (
    <MainLayout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <span className="hover:text-foreground cursor-pointer" onClick={() => navigate('/')}>
          Fraud Rules Engine
        </span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-primary font-medium">Create New Rule</span>
      </div>

      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-foreground">Create New Rule</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/')}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSaveDraft}>
            Save Draft
          </Button>
          <Button variant="outline" onClick={handleTestRule} className="text-primary border-primary/30">
            Test Rule
          </Button>
          <Button onClick={handlePublish}>
            Publish Rule ↗
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Rule Metadata */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                Rule Metadata
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Define the core identity and categorization of this rule.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ruleName" className="text-xs font-semibold text-primary uppercase">
                    Rule Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ruleName"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="e.g., High Value Claim with Mismatched Location"
                    className="bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">
                    Rule ID
                  </Label>
                  <Input
                    disabled
                    value="Auto-generated upon save"
                    className="bg-muted/30 text-muted-foreground italic"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground uppercase">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this rule detects and why it is important..."
                  className="bg-muted/50 min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">
                    Rule Type
                  </Label>
                  <Select value={ruleType} onValueChange={setRuleType}>
                    <SelectTrigger className="bg-muted/50">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ruleTypeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">
                    Severity Level
                  </Label>
                  <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger className="bg-muted/50">
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      {severityOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">
                    Tags (Optional)
                  </Label>
                  <Input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Add tags separated by comma"
                    className="bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">
                    Owner
                  </Label>
                  <Select value={owner} onValueChange={setOwner}>
                    <SelectTrigger className="bg-muted/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {admins.map((admin) => (
                        <SelectItem key={admin.id} value={admin.id}>
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                              {admin.initials}
                            </span>
                            {admin.name} {admin.id === admins[0].id ? '(You)' : ''}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detection Logic */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                </div>
                Detection Logic
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Build the conditions that trigger this rule.
              </p>
            </CardHeader>
            <CardContent>
              <LogicBuilder groups={logicGroups} onChange={setLogicGroups} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Rule Summary */}
          <Card className="bg-accent/30 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4 text-primary" />
                Rule Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground italic leading-relaxed">
                {generateRuleSummary()}
              </p>
            </CardContent>
          </Card>

          {/* Test Rule */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FlaskConical className="w-4 h-4 text-primary" />
                  Test Rule
                </CardTitle>
                <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                  Draft Mode
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  Test Dataset
                </Label>
                <Select defaultValue="last30">
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last30">Sample Fraud Claims (Last 30 days)</SelectItem>
                    <SelectItem value="last90">Sample Fraud Claims (Last 90 days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  Claim ID Input
                </Label>
                <Input placeholder="Enter Claim ID" className="bg-muted/50" />
              </div>
              <Button variant="outline" className="w-full" disabled>
                Run Test
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Results will appear here
              </p>
            </CardContent>
          </Card>

          {/* Creation Tip */}
          <Card className="bg-warning/5 border-warning/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-warning">
                <Lightbulb className="w-4 h-4" />
                Creation Tip
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Start with broader conditions to capture potential anomalies, then refine with "AND" logic to reduce false positives.
              </p>
            </CardContent>
          </Card>

          {/* Best Practices */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="w-4 h-4 text-primary" />
                Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  Use clear, descriptive names for rules so other team members understand the intent instantly.
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-64 right-0 bg-card border-t border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Unsaved changes</span>
          <span>•</span>
          <span>Last draft saved 2 mins ago</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/')}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSaveDraft} className="text-primary">
            Save Draft
          </Button>
          <Button onClick={handlePublish}>
            Publish Rule
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
