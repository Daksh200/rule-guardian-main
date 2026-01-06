import axios from 'axios';
import { FraudRule, RuleStatus, TriggerTrend, SeverityDistribution, ConditionHit, TriggeredClaim, RuleLogic } from '@/types/fraud';

const API_URL = 'http://localhost:8000/api/rules';

export const getRules = async (): Promise<FraudRule[]> => {
  const response = await axios.get(API_URL);
  return response.data.map((rule: any) => ({
    ...rule,
    id: rule.id.toString(),
    ruleId: rule.rule_id,
    owner: rule.ownerName, // Keep backward compatibility
    versions: [], // Backend doesn't populate this in list view
  }));
};

export const getRule = async (id: string): Promise<FraudRule> => {
  const response = await axios.get(`${API_URL}/${id}`);
  return response.data;
};

export const createRule = async (rule: Partial<FraudRule>): Promise<FraudRule> => {
  const response = await axios.post(API_URL, rule);
  return response.data;
};

export const updateRule = async (id: string, rule: Partial<FraudRule>): Promise<FraudRule> => {
  const response = await axios.put(`${API_URL}/${id}`, rule);
  return response.data;
};

export const deleteRule = async (id: string): Promise<void> => {
  await axios.delete(`${API_URL}/${id}`);
};

export const updateRuleStatus = async (id: string, status: RuleStatus): Promise<FraudRule> => {
  const response = await axios.put(`${API_URL}/${id}`, { status });
  return response.data;
};

export const testRule = async (ruleData: any, payload: any): Promise<any> => {
  try {
    const response = await axios.post(`${API_URL}/test`, ruleData, {
      params: { payload: JSON.stringify(payload) },
      timeout: 10000
    });
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

// Performance API
export const getRuleKpis = async (ruleId: string, days: number) => {
  const { data } = await axios.get(`${API_URL}/${ruleId}/performance/kpis`, { params: { days } });
  return data as { totalClaimsEvaluated: number; flagsTriggered: number; confirmedFraud: number; falsePositiveRate: number; hitRate: number; lastEvaluated: string };
};

export const getRuleTrends = async (ruleId: string, days: number) => {
  const { data } = await axios.get(`${API_URL}/${ruleId}/performance/trends`, { params: { days } });
  return data as TriggerTrend[];
};

export const getRuleSeverity = async (ruleId: string, days: number) => {
  const { data } = await axios.get(`${API_URL}/${ruleId}/performance/severity`, { params: { days } });
  return data as SeverityDistribution;
};

export const getRuleConditions = async (ruleId: string, days: number) => {
  const { data } = await axios.get(`${API_URL}/${ruleId}/performance/conditions`, { params: { days } });
  return data as ConditionHit[];
};

export const getTriggeredClaims = async (
  ruleId: string,
  opts: { days: number; severity?: string; decision?: string; page?: number; pageSize?: number; sort?: string }
) => {
  const { days, severity, decision, page = 1, pageSize = 20, sort } = opts;
  const skip = (page - 1) * pageSize;
  const { data } = await axios.get(`${API_URL}/${ruleId}/performance/claims`, {
    params: { days, severity, decision, skip, limit: pageSize, sort },
  });
  return data as { total: number; items: TriggeredClaim[] };
};

export const getDecisionCounts = async (ruleId: string, days: number) => {
  const { data } = await axios.get(`${API_URL}/${ruleId}/performance/decisions`, { params: { days } });
  return data as { fraud: number; legitimate: number; pending: number };
};

export const getExecution = async (executionId: string | number) => {
  const { data } = await axios.get(`${API_URL}/executions/${executionId}`);
  return data as any;
};

export const cloneRule = async (ruleId: string) => {
  const { data } = await axios.post(`${API_URL}/${ruleId}/clone`);
  return data as FraudRule;
};

export const publishRule = async (
  ruleId: string,
  payload: { name?: string; description?: string; category?: string; severity?: string; tags?: string[]; conditionSummary?: string; logic: RuleLogic; notes?: string; version?: string }
) => {
  const { data } = await axios.post(`${API_URL}/${ruleId}/publish`, payload);
  return data as FraudRule;
};
