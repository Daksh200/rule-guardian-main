import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Info, SlidersHorizontal, Lightbulb, Save, FlaskConical, Upload, AlertTriangle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { LogicBuilder } from '@/components/rules/LogicBuilder';
import { StatusBadge } from '@/components/rules/Badges';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ruleTypeOptions, severityOptions, admins, mockRules } from '@/data/mockData';
import { ConditionGroup, RuleVersion } from '@/types/fraud';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function EditRule() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  
  const rule = mockRules.find((r) => r.id === id) || mockRules[0];
  
  const [ruleName, setRuleName] = useState(rule.name);
  const [description, setDescription] = useState(rule.description);
  const [ruleType, setRuleType] = useState(rule.category);
  const [severity, setSeverity] = useState(rule.severity);
  const [owner, setOwner] = useState(admins.find((a) => a.name === rule.owner)?.id || admins[0].id);
  const [tags, setTags] = useState(rule.tags.join(', '));
  const [logicGroups, setLogicGroups] = useState<ConditionGroup[]>(rule.logic.groups);
  const [versionNotes, setVersionNotes] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleChange = () => {
    setHasUnsavedChanges(true);
  };

  const handleSaveDraft = () => {
    toast({
      title: 'Draft Saved',
      description: 'Your changes have been saved as a draft.',
    });
    setHasUnsavedChanges(false);
  };

  const handleTestRule = () => {
    toast({
      title: 'Testing Rule',
      description: 'Running rule against last 100 claims...',
    });
  };

  const handlePublish = () => {
    toast({
      title: 'Changes Published',
      description: `${ruleName} has been updated to v2.1.`,
    });
    navigate('/');
  };

  const handleDiscard = () => {
    setRuleName(rule.name);
    setDescription(rule.description);
    setLogicGroups(rule.logic.groups);
    setHasUnsavedChanges(false);
    toast({
      title: 'Changes Discarded',
      description: 'All unsaved changes have been reverted.',
    });
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
            Edit Rule: {rule.name}
          </h1>
          <div className="flex items-center gap-2">
            <StatusBadge status={rule.status} />
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
              {rule.currentVersion}
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
          <Button variant="outline" onClick={handleTestRule} className="gap-2 text-primary border-primary/30">
            <FlaskConical className="w-4 h-4" />
            Test Rule
          </Button>
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
                    value={rule.ruleId}
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
                <Button variant="link" size="sm" className="text-primary p-0 h-auto">
                  Compare
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {rule.versions.map((version: RuleVersion, index: number) => (
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
                      {version.createdAt} by {version.createdBy}
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
              <Button variant="link" size="sm" className="text-primary p-0 h-auto">
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
          <span className="text-muted-foreground">Last saved: 10 mins ago</span>
          {hasUnsavedChanges && (
            <div className="flex items-center gap-1.5 text-warning">
              <AlertTriangle className="w-4 h-4" />
              <span>2 validation warnings</span>
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
