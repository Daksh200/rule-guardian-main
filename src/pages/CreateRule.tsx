import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Info, SlidersHorizontal, Lightbulb, FileText, FlaskConical } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { LogicBuilder } from '@/components/rules/LogicBuilder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ruleTypeOptions, severityOptions, admins } from '@/data/mockData';
import { ConditionGroup, FraudRule, RuleCategory } from '@/types/fraud';
import { useToast } from '@/hooks/use-toast';
import { createRule, testRule } from '@/api/rules';

export default function CreateRule() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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

  const [testDataset, setTestDataset] = useState('last30');
  const [claimId, setClaimId] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [samplePayload, setSamplePayload] = useState<any>(null);
  const [testHistory, setTestHistory] = useState<any[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const createRuleMutation = useMutation({
    mutationFn: createRule,
    onSuccess: (newRule) => {
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      toast({
        title: newRule.status === 'active' ? 'Rule Published' : 'Draft Saved',
        description: `${newRule.name} is now ${newRule.status}.`,
      });
      if (newRule.status === 'active') {
        navigate('/');
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to save rule. Please try again.',
        variant: 'destructive',
      });
      console.error('Failed to create rule:', error);
    },
  });

  const handleSaveDraft = () => {
    if (!ruleName) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a rule name.',
        variant: 'destructive',
      });
      return;
    }
    // Validate conditions
    const invalid = logicGroups.some(g => g.conditions.some(c => !c.field || !c.operator || c.value === '' || c.value === undefined || c.value === null));
    if (invalid) {
      toast({ title: 'Validation Error', description: 'All conditions must have field, operator, and value.', variant: 'destructive' });
      return;
    }

    // Map frontend ruleType to backend category
    const categoryMap: { [key: string]: string } = {
      'velocity': 'transaction',
      'geo': 'geolocation',
      'document': 'document',
      'identity': 'identity',
    };

    const ruleData = {
      rule_id: `RL-${Date.now()}`, // Generate a unique rule ID
      name: ruleName,
      description: description || '',
      category: (categoryMap[ruleType] || ruleType || 'transaction') as RuleCategory,
      severity: (severity as 'high' | 'medium' | 'low') || 'medium',
      status: 'draft' as const,
      logic: {
        groups: logicGroups,
      },
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
    };

    createRuleMutation.mutate(ruleData);
  };

  const handleTestRule = async () => {
    console.log('handleTestRule called - starting test');

    // Validate conditions
    const invalid = logicGroups.some(g => g.conditions.some(c => !c.field || !c.operator || c.value === '' || c.value === undefined || c.value === null));
    if (invalid) {
      console.log('Validation failed - incomplete conditions');
      toast({ title: 'Validation Error', description: 'All conditions must have field, operator, and value.', variant: 'destructive' });
      return;
    }

    console.log('Validation passed, setting testing state');
    setIsTesting(true);
    setTestResult(null);

    try {
      const ruleData = {
        severity: severity || 'medium',
        groups: logicGroups,
      };

      console.log('Rule data:', ruleData);

      // Sample payload for testing
      const payload = claimId ? { claimId } : {
        "claim": {
          "amount": 5000,
          "submission_count": 1
        },
        "claimant": {
          "ip_address": "192.168.1.1"
        },
        "geo_distance": 100,
        "document": {
          "hash": "abc123"
        },
        "device": {
          "id": "device123",
          "is_new": false
        },
        "transaction": {
          "count": 5
        },
        "distinct_claims": 3
      };

      console.log('Sample payload:', payload);
      setSamplePayload(payload);

      const result = await testRule(ruleData, payload);

      const mockResult = {
        triggered: result.triggered,
        severity: result.severity,
        details: result.details,
        executionTime: 'N/A', // Backend doesn't return this yet
        testId: `TEST-${Date.now()}`,
        timestamp: new Date().toISOString(),
        // Keep some structure for UI compatibility if needed, or simplify UI
        evaluation: {
            overallResult: result.triggered,
            payloadUsed: payload
        }
      };

      console.log('Test result:', mockResult);
      setTestResult(mockResult);

      // Add to test history
      setTestHistory(prev => [mockResult, ...prev.slice(0, 9)]); // Keep last 10 tests

      toast({
        title: 'Test Completed',
        description: `Rule ${mockResult.triggered ? 'triggered' : 'did not trigger'} with severity: ${mockResult.severity}`,
      });

      console.log('Test completed successfully');
    } catch (error) {
      console.error('Test rule error:', error);
      toast({
        title: 'Test Failed',
        description: 'Failed to test the rule. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
      console.log('Testing state reset');
    }
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
    // Validate conditions
    const invalid = logicGroups.some(g => g.conditions.some(c => !c.field || !c.operator || c.value === '' || c.value === undefined || c.value === null));
    if (invalid) {
      toast({ title: 'Validation Error', description: 'All conditions must have field, operator, and value.', variant: 'destructive' });
      return;
    }

    // Map frontend ruleType to backend category
    const categoryMap: { [key: string]: string } = {
      'velocity': 'transaction',
      'geo': 'geolocation',
      'document': 'document',
      'identity': 'identity',
    };

    const ruleData = {
      rule_id: `RL-${Date.now()}`, // Generate a unique rule ID
      name: ruleName,
      description: description || '',
      category: (categoryMap[ruleType] || ruleType) as RuleCategory,
      severity: severity as 'high' | 'medium' | 'low',
      status: 'active' as const,
      logic: {
        groups: logicGroups,
      },
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
    };

    createRuleMutation.mutate(ruleData);
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
                <Select value={testDataset} onValueChange={setTestDataset}>
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
                <Input
                  placeholder="Enter Claim ID"
                  className="bg-muted/50"
                  value={claimId}
                  onChange={(e) => setClaimId(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleTestRule}
                disabled={isTesting || !logicGroups[0]?.conditions[0]?.field}
              >
                {isTesting ? 'Running Test...' : 'Run Test'}
              </Button>
              {testResult && (
                <div className="mt-3 space-y-3">
                  {/* Overall Result */}
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${testResult.triggered ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <div className="text-sm font-medium">
                        Test Result: {testResult.triggered ? 'Triggered' : 'Not Triggered'}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">
                      Severity: <span className="font-medium">{testResult.severity}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Test ID: <span className="font-medium">{testResult.testId}</span>
                    </div>
                    {testResult.details && (
                      <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                        {testResult.details}
                      </div>
                    )}
                  </div>

                  {/* Sample Payload Used */}
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="text-sm font-medium mb-2">Sample Payload Used:</div>
                    <pre className="text-xs text-muted-foreground bg-muted/50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(samplePayload, null, 2)}
                    </pre>
                  </div>

                  {/* Advanced Options Toggle */}
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-xs"
                    >
                      {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const dataStr = JSON.stringify(testResult, null, 2);
                        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                        const exportFileDefaultName = `rule-test-${testResult.testId}.json`;
                        const linkElement = document.createElement('a');
                        linkElement.setAttribute('href', dataUri);
                        linkElement.setAttribute('download', exportFileDefaultName);
                        linkElement.click();
                      }}
                      className="text-xs"
                    >
                      Export Results
                    </Button>
                  </div>

                  {/* Advanced Options */}
                  {showAdvanced && (
                    <div className="space-y-3 pt-2 border-t border-border">
                      {/* Rule Logic Summary */}
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="text-sm font-medium mb-2">Rule Logic Summary:</div>
                        <div className="text-xs text-muted-foreground">
                          <div>Groups: {logicGroups.length}</div>
                          <div>Total Conditions: {logicGroups.reduce((acc, group) => acc + group.conditions.length, 0)}</div>
                          <div>Operators Used: {Array.from(new Set(logicGroups.flatMap(g => g.conditions.map(c => c.operator)))).join(', ')}</div>
                        </div>
                      </div>

                      {/* Visual Rule Flow */}
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="text-sm font-medium mb-2">Rule Flow Visualization:</div>
                        <pre className="text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded overflow-x-auto">
                          {logicGroups.map((group, groupIndex) => (
                            `Group ${groupIndex + 1}:\n` +
                            group.conditions.map((cond, condIndex) =>
                              `  ${condIndex === 0 ? 'IF' : 'AND'} ${cond.field} ${cond.operator} ${cond.value}`
                            ).join('\n') +
                            `\n  THEN Trigger Rule\n`
                          )).join('\n')}
                        </pre>
                      </div>

                      {/* Test History */}
                      {testHistory.length > 1 && (
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <div className="text-sm font-medium mb-2">Recent Test History:</div>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {testHistory.slice(1, 4).map((historyItem: any, index: number) => (
                              <div key={index} className="text-xs p-2 bg-muted/50 rounded flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={`w-1.5 h-1.5 rounded-full ${historyItem.triggered ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                  <span>{historyItem.testId}</span>
                                </div>
                                <span className="text-muted-foreground">{historyItem.timestamp ? new Date(historyItem.timestamp).toLocaleTimeString() : ''}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {!testResult && (
                <p className="text-xs text-center text-muted-foreground">
                  Results will appear here
                </p>
              )}
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
