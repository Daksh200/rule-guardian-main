export type RuleStatus = 'active' | 'inactive' | 'draft';
export type RuleCategory = 'identity' | 'transaction' | 'geolocation' | 'document';
export type Severity = 'high' | 'medium' | 'low';
export type Operator = 'greater' | 'less' | 'equals' | 'not_equals' | 'within_time' | 'is_duplicate' | 'count' | 'contains';
export type LogicOperator = 'IF' | 'AND' | 'OR';

export interface RuleCondition {
  id: string;
  field: string;
  operator: Operator;
  value: string | number;
  unit?: string;
}

export interface ConditionGroup {
  id: string;
  logicOperator: LogicOperator;
  conditions: RuleCondition[];
}

export interface RuleLogic {
  groups: ConditionGroup[];
}

export interface RuleVersion {
  id: string;
  version: string;
  createdAt: string;
  createdBy: string;
  notes?: string;
  isActive: boolean;
  isDraft: boolean;
  logic_snapshot: RuleLogic;
}

export interface FraudRule {
  id: string;
  ruleId: string;
  name: string;
  description: string;
  category: RuleCategory;
  severity: Severity;
  status: RuleStatus;
  triggers24h: number;
  triggerDelta: number;
  lastUpdated: string;
  createdBy: string;
  ownerName: string;
  tags: string[];
  logic: RuleLogic;
  versions: RuleVersion[];
  currentVersion: string;
  conditionSummary?: string;
}

export interface RulePerformance {
  ruleId: string;
  ruleName: string;
  totalClaimsEvaluated: number;
  flagsTriggered: number;
  confirmedFraud: number;
  falsePositiveRate: number;
  hitRate: number;
  lastEvaluated: string;
  version: string;
  triggerTrends: TriggerTrend[];
  severityDistribution: SeverityDistribution;
  conditionHitMap: ConditionHit[];
  triggeredClaims: TriggeredClaim[];
}

export interface TriggerTrend {
  day: string;
  totalClaims: number;
  flags: number;
  fraud: number;
}

export interface SeverityDistribution {
  high: number;
  medium: number;
  low: number;
}

export interface ConditionHit {
  condition: string;
  percentage: number;
}

export interface TriggeredClaim {
  id: string;
  claimId: string;
  date: string;
  severity: Severity;
  triggerReasons: string[];
  decision: 'pending' | 'fraud' | 'legitimate';
  amount: number;
}

export interface Admin {
  id: string;
  name: string;
  initials: string;
  role: 'admin' | 'super_admin';
  avatar?: string;
}

export interface StatsCard {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  bgColor: string;
}
