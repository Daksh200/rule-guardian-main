import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Info, SlidersHorizontal, Lightbulb, Save, FlaskConical, Upload, AlertTriangle, X, Check } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { LogicBuilder } from '@/components/rules/LogicBuilder';
import { StatusBadge } from '@/components/rules/Badges';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ruleTypeOptions, severityOptions, admins } from '@/data/mockData';
import { ConditionGroup, RuleVersion, FraudRule } from '@/types/fraud';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getRule, updateRule, testRule, publishRule, getRuleVersions, updateRuleVersionNotes } from '@/api/rules';

export default function EditRule() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rule } = useQuery({
    queryKey: ['rule', id],
    queryFn: () => getRule(id as string),
    enabled: !!id,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['rule', id, 'versions'],
    queryFn: () => getRuleVersions(id as string),
    enabled: !!id,
  });
  
  const [ruleName, setRuleName] = useState('');
  const [description, setDescription] = useState('');
  const [ruleType, setRuleType] = useState<'identity'|'transaction'|'geolocation'|'document'>('identity');
  const [severity, setSeverity] = useState<'high'|'medium'|'low'>('low');
  const [owner, setOwner] = useState(admins[0].id);
  const [tags, setTags] = useState('');
  const [logicGroups, setLogicGroups] = useState<ConditionGroup[]>([]);
  const [versionNotes, setVersionNotes] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Test Rule State
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [testPayload, setTestPayload] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Compare State
  const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(false);
  const [compareVersionId, setCompareVersionId] = useState<string>('');

  useEffect(() => {
    if (rule) {
      setRuleName(rule.name);
      setDescription(rule.description);
      setRuleType(rule.category);
      setSeverity(rule.severity);
      setTags((rule.tags || []).join(', '));
      setLogicGroups(rule.logic.groups);
    }
  }, [rule]);

  // Set initial version notes from the latest version if available
  useEffect(() => {
    if (versions.length > 0) {
      // Assuming the first one is the latest/current one being edited or viewed
      setVersionNotes(versions[0].notes || '');
    }
  }, [versions]);

  const handleChange = () => {
    setHasUnsavedChanges(true);
  };

  const handleSaveDraft = async () => {
    if (!id) return;
    try {
      const payload: Partial<FraudRule> = {
        name: ruleName,
        description,
        category: ruleType,
        severity,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        logic: { groups: logicGroups },
      } as any;
      await updateRule(id, payload);
      queryClient.invalidateQueries({ queryKey: ['rule', id] });
      setHasUnsavedChanges(false);
      toast({ title: 'Draft Saved', description: 'Your changes have been saved.' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to save draft.', variant: 'destructive' });
    }
  };

  const handleSaveNote = async () => {
    if (!id || versions.length === 0) return;
    // Assuming we are updating the note of the latest version
    const latestVersion = versions[0];
    try {
      await updateRuleVersionNotes(latestVersion.id.toString(), versionNotes);
      queryClient.invalidateQueries({ queryKey: ['rule', id, 'versions'] });
      toast({ title: 'Note Saved', description: 'Version note updated.' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to save note.', variant: 'destructive' });
    }
  };

  const handleTestRule = async () => {
    if (!testPayload) {
      toast({ title: 'Validation Error', description: 'Please provide a JSON payload.', variant: 'destructive' });
      return;
    }
    
    let parsedPayload;
    try {
      parsedPayload = JSON.parse(testPayload);
    } catch (e) {
      toast({ title: 'Validation Error', description: 'Invalid JSON format.', variant: 'destructive' });
      return;
    }

    setIsTesting(true);
    try {
      const result = await testRule({ severity, groups: logicGroups }, parsedPayload);
      setTestResult(result);
      toast({ title: 'Test Completed', description: result.triggered ? 'Rule Triggered!' : 'Rule did not trigger.' });
    } catch (e) {
      toast({ title: 'Error', description: 'Test failed.', variant: 'destructive' });
    } finally {
      setIsTesting(false);
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    try {
      // Robustly increment semantic-like versions 'v<major>.<minor>'
      const currentVer = (rule?.currentVersion || 'v1.0').trim();
      const m = /^v(\d+)\.(\d+)$/.exec(currentVer);
      let nextVersion = 'v1.1';
      if (m) {
        const major = parseInt(m[1], 10);
        const minor = parseInt(m[2], 10);
        // Increment minor by 1 (no rollover policy unless desired)
        nextVersion = `v${major}.${minor + 1}`;
      }

      const payload = {
        name: ruleName,
        description,
        category: ruleType,
        severity,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        logic: { groups: logicGroups },
        version: nextVersion,
        notes: versionNotes,
      };
      await publishRule(id, payload as any);
      toast({ title: 'Changes Published', description: `${ruleName} published as ${nextVersion}.` });
      navigate('/');
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to publish changes.', variant: 'destructive' });
    }
  };

  const handleDiscard = () => {
    setRuleName(rule?.name || '');
    setDescription(rule?.description || '');
    setLogicGroups(rule?.logic?.groups || []);
    setHasUnsavedChanges(false);
    toast({
      title: 'Changes Discarded',
      description: 'All unsaved changes have been reverted.',
    });
  };

  const getComparisonDiff = () => {
    if (!compareVersionId) return null;
    const compareVersion = versions.find(v => v.id.toString() === compareVersionId);
    if (!compareVersion) return null;

    // Simple diff logic: compare current state vs selected version
    const currentLogic = JSON.stringify(logicGroups);
    const compareLogic = JSON.stringify(compareVersion.logic_snapshot.groups);
    
    return {
      version: compareVersion.version,
      isLogicDifferent: currentLogic !== compareLogic,
      // Add more granular diffs if needed
    };
  };

  return (
    <MainLayout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <span className="hover:text-foreground cursor-pointer" onClick={() => navigate('/')}>
          Fraud Rules Engine
        </span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-primary font-medium">Rule Builder</span>
      </div>

      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">
            Edit Rule: {rule?.name || ''}
          </h1>
          <div className="flex items-center gap-2">
            <StatusBadge status={rule?.status || 'draft'} />
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
              {rule?.currentVersion || ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/')}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSaveDraft} className="gap-2">
            <Save className="w-4 h-4" />
            Save Draft
          </Button>
          
          <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 text-primary border-primary/30">
                <FlaskConical className="w-4 h-4" />
                Test Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Test Rule Logic</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Test Payload (JSON)</Label>
                  <Textarea 
                    value={testPayload}
                    onChange={(e) => setTestPayload(e.target.value)}
                    placeholder='{"claim": {"amount": 5000, ...}}'
                    className="font-mono text-xs min-h-[200px]"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setTestPayload(JSON.stringify({
                      claim: { amount: 5000, submission_count: 1 },
                      claimant: { ip_address: "192.168.1.1" },
                      transaction: { count: 5 }
                    }, null, 2))}>
                      Load Sample
                    </Button>
                  </div>
                </div>
                
                {testResult && (
                  <div className={cn("p-4 rounded-lg border", testResult.triggered ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200")}>
                    <div className="flex items-center gap-2 font-semibold mb-2">
                      {testResult.triggered ? <X className="text-red-600 w-5 h-5" /> : <Check className="text-green-600 w-5 h-5" />}
                      <span className={testResult.triggered ? "text-red-700" : "text-green-700"}>
                        {testResult.triggered ? "Rule Triggered" : "Rule Not Triggered"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{testResult.details}</p>
                    {testResult.triggered && (
                      <div className="mt-2 text-xs font-medium text-red-600">
                        Severity: {testResult.severity}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={handleTestRule} disabled={isTesting}>
                  {isTesting ? 'Running...' : 'Run Test'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={handlePublish} className="gap-2">
            <Upload className="w-4 h-4" />
            Publish Changes
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
                  <Info className="w-4 h-4 text-primary" />
                </div>
                Rule Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-primary uppercase">
                    Rule Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={ruleName}
                    onChange={(e) => { setRuleName(e.target.value); handleChange(); }}
                    className="bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">
                    Rule ID
                  </Label>
                  <Input
                    disabled
                    value={rule?.ruleId || rule?.rule_id || ''}
                    className="bg-muted/30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-primary uppercase">
                  Description
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); handleChange(); }}
                  className="bg-muted/50 min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">
                    Rule Type
                  </Label>
                  <Select value={ruleType} onValueChange={(v) => { setRuleType(v as any); handleChange(); }}>
                    <SelectTrigger className="bg-muted/50">
                      <SelectValue />
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
                    Severity
                  </Label>
                  <Select value={severity} onValueChange={(v) => { setSeverity(v as any); handleChange(); }}>
                    <SelectTrigger className="bg-muted/50">
                      <SelectValue />
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
                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                              {admin.initials}
                            </span>
                            {admin.name.split(' ')[0]}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">
                    Tags
                  </Label>
                  <Input
                    value={tags}
                    onChange={(e) => { setTags(e.target.value); handleChange(); }}
                    className="bg-muted/50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logic Builder */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                  </div>
                  Logic Builder
                </CardTitle>
                <code className="text-xs bg-muted px-3 py-1 rounded text-muted-foreground">
                  IF (A & B & C) THEN ...
                </code>
              </div>
            </CardHeader>
            <CardContent>
              <LogicBuilder
                groups={logicGroups}
                onChange={(groups) => {
                  setLogicGroups(groups);
                  handleChange();
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Version History */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Version History</CardTitle>
                <Dialog open={isCompareDialogOpen} onOpenChange={setIsCompareDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="link" size="sm" className="text-primary p-0 h-auto">
                      Compare
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Compare Versions</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Select Version to Compare with Current Draft</Label>
                        <Select value={compareVersionId} onValueChange={setCompareVersionId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a version" />
                          </SelectTrigger>
                          <SelectContent>
                            {versions.map((v: RuleVersion) => (
                              <SelectItem key={v.id} value={v.id.toString()}>
                                {v.version} ({new Date(v.createdAt).toLocaleDateString()})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {compareVersionId && (
                        <div className="p-4 bg-muted rounded-lg text-sm">
                          {(() => {
                            const diff = getComparisonDiff();
                            if (!diff) return null;
                            return (
                              <div className="space-y-2">
                                <p>Comparing <strong>Current Draft</strong> with <strong>{diff.version}</strong>:</p>
                                <div className="flex items-center gap-2">
                                  {diff.isLogicDifferent ? (
                                    <span className="text-yellow-600 font-medium">Logic has changed</span>
                                  ) : (
                                    <span className="text-green-600 font-medium">Logic is identical</span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[300px] overflow-y-auto">
              {versions.length === 0 && (
                <p className="text-xs text-muted-foreground">No history available.</p>
              )}
              {versions.map((version: RuleVersion) => (
                <div
                  key={version.id}
                  className={cn(
                    'flex gap-3 p-3 rounded-lg transition-colors',
                    version.isDraft ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/50'
                  )}
                >
                  <div
                    className={cn(
                      'w-2.5 h-2.5 rounded-full mt-1.5 shrink-0',
                      version.isDraft ? 'bg-primary' : version.isActive ? 'bg-success' : 'bg-muted-foreground/30'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {version.version} {version.isDraft && '(Draft)'}
                        {version.isActive && !version.isDraft && '(Active)'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(version.createdAt).toLocaleString()}
                    </p>
                    {version.isDraft && hasUnsavedChanges && (
                      <span className="inline-block mt-1 text-xs bg-warning/20 text-warning px-2 py-0.5 rounded">
                        Unsaved Changes
                      </span>
                    )}
                    {version.notes && (
                      <p className="text-xs text-primary mt-1 italic">{version.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Version Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Version Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={versionNotes}
                onChange={(e) => setVersionNotes(e.target.value)}
                placeholder="Describe what changed in this version..."
                className="min-h-[100px] bg-muted/50"
              />
              <Button variant="link" size="sm" className="text-primary p-0 h-auto" onClick={handleSaveNote}>
                Save Note
              </Button>
            </CardContent>
          </Card>

          {/* Best Practice */}
          <Card className="bg-warning/5 border-warning/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-warning">
                <Lightbulb className="w-4 h-4" />
                Best Practice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Rules with broad "Velocity" checks can cause high false positives. Use the{' '}
                <strong>Test Rule</strong> feature on "Last 100 Claims" to verify impact before publishing.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-64 right-0 bg-card border-t border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">Last saved: {rule?.lastUpdated || 'Never'}</span>
          {hasUnsavedChanges && (
            <div className="flex items-center gap-1.5 text-warning">
              <AlertTriangle className="w-4 h-4" />
              <span>Unsaved changes</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={handleDiscard}>
            Discard
          </Button>
          <Button variant="outline" onClick={handleSaveDraft}>
            Save Draft
          </Button>
          <Button onClick={handlePublish} className="gap-2">
            <Upload className="w-4 h-4" />
            Publish Rule
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
