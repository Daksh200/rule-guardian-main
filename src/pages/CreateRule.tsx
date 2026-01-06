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

  const handleSaveDraft = () => {
    if (!ruleName) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a rule name.',
        variant: 'destructive',
      });
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

    createRuleMutation.mutate(ruleData, {
      onSuccess: (newRule) => {
        toast({
          title: 'Draft Saved',
          description: 'Your rule has been saved as a draft.',
        });
        // Don't navigate away, stay on the create page
      },
    });
  };

  const handleTestRule = async () => {
    console.log('handleTestRule called - starting test');

    if (!logicGroups[0]?.conditions[0]?.field) {
      console.log('Validation failed - no field specified');
      toast({
        title: 'Validation Error',
        description: 'Please add at least one condition to test the rule.',
        variant: 'destructive',
      });
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
      const samplePayload = claimId ? { claimId } : {
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

      console.log('Sample payload:', samplePayload);
      setSamplePayload(samplePayload);

      // Enhanced mock rule evaluation
      const evaluateCondition = (condition: any, payload: any) => {
        const { field, operator, value } = condition;
        const fieldValue = field.split('.').reduce((obj: any, key: string) => obj?.[key], payload);
        const numericValue = typeof value === 'string' ? parseInt(value || '0') : value || 0;
        const numericFieldValue = typeof fieldValue === 'string' ? parseInt(fieldValue || '0') : fieldValue || 0;

        console.log(`Evaluating: ${fieldValue} ${operator} ${numericValue}`);

        switch (operator) {
          case 'greater':
            return numericFieldValue > numericValue;
          case 'less':
            return numericFieldValue < numericValue;
          case 'equals':
            return fieldValue == value;
          case 'not_equals':
            return fieldValue != value;
          case 'contains':
            return String(fieldValue).includes(String(value));
          default:
            return false;
        }
      };

      // Evaluate all conditions in the first group
      const conditions = logicGroups[0]?.conditions || [];
      const evaluationResults = conditions.map((condition: any) => ({
        condition,
        fieldValue: condition.field.split('.').reduce((obj: any, key: string) => obj?.[key], samplePayload),
        result: evaluateCondition(condition, samplePayload)
      }));

      const allConditionsMet = evaluationResults.every((evalResult: any) => evalResult.result);
      const triggered = conditions.length > 0 && allConditionsMet;

      // Rule validation checks
      const validationIssues = [];
      if (conditions.length === 0) validationIssues.push('No conditions defined');
      if (conditions.some(c => !c.field)) validationIssues.push('Some conditions missing field selection');
      if (conditions.some(c => !c.value)) validationIssues.push('Some conditions missing values');
      if (conditions.some(c => c.operator === 'greater' && isNaN(Number(c.value)))) validationIssues.push('Numeric operators used with non-numeric values');

      // Performance metrics
      const startTime = performance.now();
      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));
      const endTime = performance.now();

      const mockResult = {
        triggered,
        severity: severity || 'medium',
        evaluation: {
          conditions: evaluationResults,
          overallResult: triggered,
          payloadUsed: samplePayload
        },
        details: triggered
          ? `Rule triggered successfully! All ${conditions.length} condition(s) were met.`
          : `Rule did not trigger. ${evaluationResults.filter((r: any) => !r.result).length} out of ${conditions.length} condition(s) failed.`,
        executionTime: `${(endTime - startTime).toFixed(2)}ms`,
        testId: `TEST-${Date.now()}`,
        validation: {
          issues: validationIssues,
          isValid: validationIssues.length === 0
        },
        performance: {
          executionTime: endTime - startTime,
          memoryUsage: 'N/A (Frontend)',
          conditionsEvaluated: conditions.length
        },
        ruleLogic: logicGroups,
        timestamp: new Date().toISOString()
      };

      console.log('Mock result:', mockResult);
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

  const createRuleMutation = useMutation({
    mutationFn: createRule,
    onSuccess: (newRule) => {
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      toast({
        title: 'Rule Published',
        description: `${ruleName} is now active.`,
      });
      navigate('/');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create rule. Please try again.',
        variant: 'destructive',
      });
      console.error('Failed to create rule:', error);
    },
  });

  const handlePublish = () => {
    if (!ruleName || !ruleType || !severity) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
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
                      Execution Time: <span className="font-medium">{testResult.executionTime}</span> | Test ID: <span className="font-medium">{testResult.testId}</span>
                    </div>
                    {testResult.details && (
                      <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                        {testResult.details}
                      </div>
                    )}
                  </div>

                  {/* Condition Evaluation Details */}
                  {testResult.evaluation?.conditions && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="text-sm font-medium mb-2">Condition Evaluation Details:</div>
                      <div className="space-y-2">
                        {testResult.evaluation.conditions.map((evalResult: any, index: number) => (
                          <div key={index} className="text-xs p-2 bg-muted/50 rounded">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`w-1.5 h-1.5 rounded-full ${evalResult.result ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              <span className="font-medium">
                                {evalResult.condition.field} {evalResult.condition.operator} {evalResult.condition.value}
                              </span>
                            </div>
                            <div className="text-muted-foreground ml-3">
                              Actual value: <span className="font-medium">{evalResult.fieldValue}</span> | Expected: <span className="font-medium">{evalResult.condition.operator} {evalResult.condition.value}</span> | Result: <span className={`font-medium ${evalResult.result ? 'text-green-600' : 'text-red-600'}`}>{evalResult.result ? 'PASS' : 'FAIL'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Validation Issues */}
                  {testResult.validation?.issues && testResult.validation.issues.length > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="text-sm font-medium mb-2 text-yellow-800">Validation Issues:</div>
                      <div className="space-y-1">
                        {testResult.validation.issues.map((issue: string, index: number) => (
                          <div key={index} className="text-xs text-yellow-700 flex items-center gap-2">
                            <span className="w-1 h-1 bg-yellow-500 rounded-full"></span>
                            {issue}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Performance Metrics */}
                  {testResult.performance && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="text-sm font-medium mb-2">Performance Metrics:</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>Execution Time: <span className="font-medium">{testResult.performance.executionTime.toFixed(2)}ms</span></div>
                        <div>Conditions Evaluated: <span className="font-medium">{testResult.performance.conditionsEvaluated}</span></div>
                        <div>Memory Usage: <span className="font-medium">{testResult.performance.memoryUsage}</span></div>
                        <div>Test Timestamp: <span className="font-medium">{new Date(testResult.timestamp).toLocaleTimeString()}</span></div>
                      </div>
                    </div>
                  )}

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
                          <div>Groups: {testResult.ruleLogic?.length || 0}</div>
                          <div>Total Conditions: {logicGroups.reduce((acc, group) => acc + group.conditions.length, 0)}</div>
                          <div>Operators Used: {Array.from(new Set(logicGroups.flatMap(g => g.conditions.map(c => c.operator)))).join(', ')}</div>
                        </div>
                      </div>

                      {/* Test Coverage Analysis */}
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="text-sm font-medium mb-2">Test Coverage Analysis:</div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Payload Fields Used: {Array.from(new Set(logicGroups.flatMap(g => g.conditions.map(c => c.field)))).length}</div>
                          <div>Payload Fields Available: {Object.keys(samplePayload).length + Object.values(samplePayload).filter(v => typeof v === 'object' && v !== null).reduce((acc, obj) => acc + Object.keys(obj as Record<string, any>).length, 0)}</div>
                          <div>Coverage: {((Array.from(new Set(logicGroups.flatMap(g => g.conditions.map(c => c.field)))).length / (Object.keys(samplePayload).length + Object.values(samplePayload).filter(v => typeof v === 'object' && v !== null).reduce((acc, obj) => acc + Object.keys(obj as Record<string, any>).length, 0))) * 100).toFixed(1)}%</div>
                        </div>
                      </div>

                      {/* Rule Complexity Score */}
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="text-sm font-medium mb-2">Rule Complexity Score:</div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Score: {(() => {
                            const conditions = logicGroups.reduce((acc, group) => acc + group.conditions.length, 0);
                            const operators = new Set(logicGroups.flatMap(g => g.conditions.map(c => c.operator))).size;
                            const complexity = (conditions * 2) + (operators * 3) + (logicGroups.length * 5);
                            return complexity;
                          })()} / 100</div>
                          <div className="text-xs">
                            <span className={`px-1 py-0.5 rounded text-xs ${(() => {
                              const conditions = logicGroups.reduce((acc, group) => acc + group.conditions.length, 0);
                              const operators = new Set(logicGroups.flatMap(g => g.conditions.map(c => c.operator))).size;
                              const complexity = (conditions * 2) + (operators * 3) + (logicGroups.length * 5);
                              return complexity < 20 ? 'text-green-600 bg-green-50' : complexity < 50 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50';
                            })()}`}>
                              {(() => {
                                const conditions = logicGroups.reduce((acc, group) => acc + group.conditions.length, 0);
                                const operators = new Set(logicGroups.flatMap(g => g.conditions.map(c => c.operator))).size;
                                const complexity = (conditions * 2) + (operators * 3) + (logicGroups.length * 5);
                                return complexity < 20 ? 'Low' : complexity < 50 ? 'Medium' : 'High';
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Confidence Score */}
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="text-sm font-medium mb-2">Confidence Score:</div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Score: {testResult.evaluation?.conditions ? ((testResult.evaluation.conditions.filter((c: any) => c.result).length / testResult.evaluation.conditions.length) * 100).toFixed(1) : 0}%</div>
                          <div>Conditions Met: {testResult.evaluation?.conditions?.filter((c: any) => c.result).length || 0} / {testResult.evaluation?.conditions?.length || 0}</div>
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

                      {/* Test Coverage Analysis */}
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="text-sm font-medium mb-2">Test Coverage Analysis:</div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Payload Fields Used: {Array.from(new Set(logicGroups.flatMap(g => g.conditions.map(c => c.field)))).length}</div>
                          <div>Payload Fields Available: {Object.keys(samplePayload).length + Object.values(samplePayload).filter(v => typeof v === 'object' && v !== null).reduce((acc, obj) => acc + Object.keys(obj as Record<string, any>).length, 0)}</div>
                          <div>Coverage: {((Array.from(new Set(logicGroups.flatMap(g => g.conditions.map(c => c.field)))).length / (Object.keys(samplePayload).length + Object.values(samplePayload).filter(v => typeof v === 'object' && v !== null).reduce((acc, obj) => acc + Object.keys(obj as Record<string, any>).length, 0))) * 100).toFixed(1)}%</div>
                        </div>
                      </div>

                      {/* Rule Complexity Score */}
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="text-sm font-medium mb-2">Rule Complexity Score:</div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Score: {(() => {
                            const conditions = logicGroups.reduce((acc, group) => acc + group.conditions.length, 0);
                            const operators = new Set(logicGroups.flatMap(g => g.conditions.map(c => c.operator))).size;
                            const complexity = (conditions * 2) + (operators * 3) + (logicGroups.length * 5);
                            return complexity;
                          })()} / 100</div>
                          <div className="text-xs">
                            <span className={`px-1 py-0.5 rounded text-xs ${(() => {
                              const conditions = logicGroups.reduce((acc, group) => acc + group.conditions.length, 0);
                              const operators = new Set(logicGroups.flatMap(g => g.conditions.map(c => c.operator))).size;
                              const complexity = (conditions * 2) + (operators * 3) + (logicGroups.length * 5);
                              return complexity < 20 ? 'text-green-600 bg-green-50' : complexity < 50 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50';
                            })()}`}>
                              {(() => {
                                const conditions = logicGroups.reduce((acc, group) => acc + group.conditions.length, 0);
                                const operators = new Set(logicGroups.flatMap(g => g.conditions.map(c => c.operator))).size;
                                const complexity = (conditions * 2) + (operators * 3) + (logicGroups.length * 5);
                                return complexity < 20 ? 'Low' : complexity < 50 ? 'Medium' : 'High';
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Confidence Score */}
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="text-sm font-medium mb-2">Confidence Score:</div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Score: {testResult.evaluation?.conditions ? ((testResult.evaluation.conditions.filter((c: any) => c.result).length / testResult.evaluation.conditions.length) * 100).toFixed(1) : 0}%</div>
                          <div>Conditions Met: {testResult.evaluation?.conditions?.filter((c: any) => c.result).length || 0} / {testResult.evaluation?.conditions?.length || 0}</div>
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
                                <span className="text-muted-foreground">{historyItem.executionTime}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Optimization Suggestions */}
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-sm font-medium mb-2 text-blue-800">Optimization Suggestions:</div>
                        <div className="space-y-1">
                          {(() => {
                            const suggestions = [];
                            const conditions = logicGroups.reduce((acc, group) => acc + group.conditions.length, 0);
                            if (conditions > 5) suggestions.push('Consider breaking complex rules into multiple simpler rules');
                            if (logicGroups.length > 1) suggestions.push('Multiple logic groups detected - ensure proper AND/OR logic');
                            const operators = Array.from(new Set(logicGroups.flatMap(g => g.conditions.map(c => c.operator))));
                            if (operators.includes('contains') && operators.some(op => ['greater', 'less', 'equals'].includes(op))) {
                              suggestions.push('Mixing string and numeric operators - verify data types');
                            }
                            if (suggestions.length === 0) suggestions.push('Rule structure looks optimal');
                            return suggestions;
                          })().map((suggestion: string, index: number) => (
                            <div key={index} className="text-xs text-blue-700 flex items-center gap-2">
                              <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                              {suggestion}
                            </div>
                          ))}
                        </div>
                      </div>
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
