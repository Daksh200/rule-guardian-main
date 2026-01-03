import { FraudRule, RulePerformance, Admin, TriggerTrend, TriggeredClaim } from '@/types/fraud';

export const currentAdmin: Admin = {
  id: '1',
  name: 'Alexandra M.',
  initials: 'AM',
  role: 'super_admin',
};

export const admins: Admin[] = [
  currentAdmin,
  { id: '2', name: 'Sarah Jenkins', initials: 'SJ', role: 'admin' },
  { id: '3', name: 'Mike Chen', initials: 'MC', role: 'admin' },
  { id: '4', name: 'Jane Doe', initials: 'JD', role: 'super_admin' },
];

export const mockRules: FraudRule[] = [
  {
    id: '1',
    ruleId: 'RL-2023-001',
    name: 'Multiple Accounts - Same Device',
    description: 'Flags claimants who have submitted more than 3 distinct claims within a 24-hour window from the same IP address.',
    category: 'identity',
    severity: 'high',
    status: 'active',
    triggers24h: 124,
    triggerDelta: 80,
    lastUpdated: '2 mins ago',
    createdBy: 'Sarah Jenkins',
    owner: 'Sarah Jenkins',
    tags: ['Bot', 'IP-Check'],
    conditionSummary: 'device_id match > 3 accounts',
    logic: {
      groups: [
        {
          id: '1',
          logicOperator: 'IF',
          conditions: [
            { id: '1', field: 'claim.submission_count', operator: 'within_time', value: 24, unit: 'hours' },
          ],
        },
        {
          id: '2',
          logicOperator: 'AND',
          conditions: [
            { id: '2', field: 'distinct_claims', operator: 'greater', value: 3 },
          ],
        },
        {
          id: '3',
          logicOperator: 'AND',
          conditions: [
            { id: '3', field: 'claimant.ip_address', operator: 'is_duplicate', value: 'in current batch' },
          ],
        },
      ],
    },
    versions: [
      { id: '1', version: 'v2.0', createdAt: 'just now', createdBy: 'You', notes: '', isActive: false, isDraft: true },
      { id: '2', version: 'v1.2', createdAt: 'Oct 24, 2023', createdBy: 'Sarah', notes: 'Adjusted time window from 12h to 24h based on new...', isActive: true, isDraft: false },
      { id: '3', version: 'v1.0', createdAt: 'Sep 01, 2023', createdBy: 'Mike', notes: '', isActive: false, isDraft: false },
    ],
    currentVersion: 'v2.0',
  },
  {
    id: '2',
    ruleId: 'RL-2023-002',
    name: 'High Velocity Transactions',
    description: 'Detects unusual transaction velocity patterns.',
    category: 'transaction',
    severity: 'medium',
    status: 'active',
    triggers24h: 856,
    triggerDelta: 50,
    lastUpdated: '1 hour ago',
    createdBy: 'Mike Chen',
    owner: 'Mike Chen',
    tags: ['Velocity', 'Pattern'],
    conditionSummary: 'txn_count > 5 in 10 mins',
    logic: {
      groups: [
        {
          id: '1',
          logicOperator: 'IF',
          conditions: [
            { id: '1', field: 'transaction.count', operator: 'greater', value: 5 },
          ],
        },
      ],
    },
    versions: [
      { id: '1', version: 'v1.0', createdAt: 'Oct 20, 2023', createdBy: 'Mike', notes: '', isActive: true, isDraft: false },
    ],
    currentVersion: 'v1.0',
  },
  {
    id: '3',
    ruleId: 'RL-2023-003',
    name: 'Geo Mismatch - Login vs Card',
    description: 'Flags when login location differs significantly from card usage location.',
    category: 'geolocation',
    severity: 'high',
    status: 'inactive',
    triggers24h: 42,
    triggerDelta: 75,
    lastUpdated: '5 hours ago',
    createdBy: 'Alexandra M.',
    owner: 'Alexandra M.',
    tags: ['Geo', 'Location'],
    conditionSummary: 'geo_dist > 500 miles',
    logic: {
      groups: [
        {
          id: '1',
          logicOperator: 'IF',
          conditions: [
            { id: '1', field: 'geo_distance', operator: 'greater', value: 500, unit: 'miles' },
          ],
        },
      ],
    },
    versions: [
      { id: '1', version: 'v1.0', createdAt: 'Oct 15, 2023', createdBy: 'Alexandra', notes: '', isActive: true, isDraft: false },
    ],
    currentVersion: 'v1.0',
  },
  {
    id: '4',
    ruleId: 'RL-2023-004',
    name: 'New Device - Large Transfer',
    description: 'Flags large transfers from newly registered devices.',
    category: 'transaction',
    severity: 'medium',
    status: 'active',
    triggers24h: 12,
    triggerDelta: 40,
    lastUpdated: '1 day ago',
    createdBy: 'Sarah Jenkins',
    owner: 'Sarah Jenkins',
    tags: ['Device', 'Amount'],
    conditionSummary: 'amount > $5000 AND new_device',
    logic: {
      groups: [
        {
          id: '1',
          logicOperator: 'IF',
          conditions: [
            { id: '1', field: 'amount', operator: 'greater', value: 5000 },
          ],
        },
        {
          id: '2',
          logicOperator: 'AND',
          conditions: [
            { id: '2', field: 'device.is_new', operator: 'equals', value: 'true' },
          ],
        },
      ],
    },
    versions: [
      { id: '1', version: 'v1.0', createdAt: 'Oct 10, 2023', createdBy: 'Sarah', notes: '', isActive: true, isDraft: false },
    ],
    currentVersion: 'v1.0',
  },
  {
    id: '5',
    ruleId: 'RL-2023-005',
    name: 'Duplicate Document Rule',
    description: 'Detects duplicate document submissions across claims.',
    category: 'document',
    severity: 'high',
    status: 'active',
    triggers24h: 294,
    triggerDelta: 23,
    lastUpdated: '2 hours ago',
    createdBy: 'Jane Doe',
    owner: 'Jane Doe',
    tags: ['Document', 'Duplicate'],
    conditionSummary: 'document_hash is duplicate',
    logic: {
      groups: [
        {
          id: '1',
          logicOperator: 'IF',
          conditions: [
            { id: '1', field: 'document.hash', operator: 'is_duplicate', value: 'in database' },
          ],
        },
      ],
    },
    versions: [
      { id: '1', version: 'v1.2', createdAt: '2 hours ago', createdBy: 'Jane', notes: '', isActive: true, isDraft: false },
    ],
    currentVersion: 'v1.2',
  },
];

export const generateTriggerTrends = (days: number): TriggerTrend[] => {
  const trends: TriggerTrend[] = [];
  for (let i = 0; i < days; i++) {
    const day = i === 0 ? 'DAY 1' : i === days - 1 ? 'TODAY' : `DAY ${i + 1}`;
    trends.push({
      day,
      totalClaims: Math.floor(Math.random() * 500) + 500,
      flags: Math.floor(Math.random() * 100) + 50,
      fraud: Math.floor(Math.random() * 30) + 10,
    });
  }
  return trends;
};

export const generateTriggeredClaims = (): TriggeredClaim[] => [
  {
    id: '1',
    claimId: '#CLM-9234',
    date: 'Oct 24, 2023',
    severity: 'high',
    triggerReasons: ['File Hash Match', 'Timestamp Conflict'],
    decision: 'pending',
    amount: 4500.00,
  },
  {
    id: '2',
    claimId: '#CLM-9231',
    date: 'Oct 23, 2023',
    severity: 'medium',
    triggerReasons: ['File Hash Match'],
    decision: 'fraud',
    amount: 1250.00,
  },
  {
    id: '3',
    claimId: '#CLM-9188',
    date: 'Oct 23, 2023',
    severity: 'low',
    triggerReasons: ['Metadata Anomaly'],
    decision: 'legitimate',
    amount: 850.00,
  },
  {
    id: '4',
    claimId: '#CLM-9102',
    date: 'Oct 21, 2023',
    severity: 'high',
    triggerReasons: ['File Hash Match', 'Size Mismatch'],
    decision: 'fraud',
    amount: 12400.00,
  },
];

export const mockRulePerformance: RulePerformance = {
  ruleId: '5',
  ruleName: 'Duplicate Document Rule',
  totalClaimsEvaluated: 12500,
  flagsTriggered: 294,
  confirmedFraud: 56,
  falsePositiveRate: 1.8,
  hitRate: 2.3,
  lastEvaluated: '2 hours ago',
  version: 'v1.2',
  triggerTrends: generateTriggerTrends(30),
  severityDistribution: {
    high: 18,
    medium: 40,
    low: 42,
  },
  conditionHitMap: [
    { condition: 'File Hash Match', percentage: 88 },
    { condition: 'Timestamp Conflict', percentage: 52 },
    { condition: 'Metadata Anomaly', percentage: 34 },
    { condition: 'Size Mismatch', percentage: 12 },
  ],
  triggeredClaims: generateTriggeredClaims(),
};

export const fieldOptions = [
  { value: 'claim.amount', label: 'Claim Amount' },
  { value: 'claim.submission_count', label: 'Claim Submission Count' },
  { value: 'claimant.ip_address', label: 'Claimant IP Address' },
  { value: 'geo_distance', label: 'Geo Distance' },
  { value: 'document.hash', label: 'Document Hash' },
  { value: 'device.id', label: 'Device ID' },
  { value: 'device.is_new', label: 'Is New Device' },
  { value: 'transaction.count', label: 'Transaction Count' },
  { value: 'distinct_claims', label: 'Distinct Claims' },
];

export const operatorOptions = [
  { value: 'greater', label: 'greater than' },
  { value: 'less', label: 'less than' },
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'within_time', label: 'within last' },
  { value: 'is_duplicate', label: 'is duplicate' },
  { value: 'count', label: 'count' },
  { value: 'contains', label: 'contains' },
];

export const ruleTypeOptions = [
  { value: 'velocity', label: 'Velocity' },
  { value: 'geo', label: 'Geolocation' },
  { value: 'document', label: 'Document' },
  { value: 'identity', label: 'Identity' },
];

export const severityOptions = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export const categoryOptions = [
  { value: 'identity', label: 'Identity' },
  { value: 'transaction', label: 'Transaction' },
  { value: 'geolocation', label: 'Geolocation' },
  { value: 'document', label: 'Document' },
];
