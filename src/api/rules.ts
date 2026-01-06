import axios from 'axios';
import { FraudRule, RuleStatus } from '@/types/fraud';

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
    console.log('API call to test rule:', `${API_URL}/test`);
    console.log('Rule data:', ruleData);
    console.log('Payload:', payload);

    const response = await axios.post(`${API_URL}/test`, ruleData, {
      params: { payload: JSON.stringify(payload) },
      timeout: 10000 // 10 second timeout
    });

    console.log('API response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('API error in testRule:', error);
    throw error; // Re-throw to let the component handle it
  }
};
