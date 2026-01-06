import axios from 'axios';

export type AuditFilters = {
  page?: number;
  limit?: number;
  action?: string;
  entity_type?: string;
  actor_email?: string;
  entity_id?: string;
  date_from?: string; // ISO
  date_to?: string;   // ISO
};

export type AuditLogItem = {
  id: number;
  created_at: string | null;
  actor_id?: number | null;
  actor_email?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  entity_label?: string | null;
  metadata?: any;
};

export const getAuditLogs = async (filters: AuditFilters) => {
  const params = { page: 1, limit: 20, ...filters } as any;
  const { data } = await axios.get('http://localhost:8000/api/audit', { params });
  return data as { total: number; items: AuditLogItem[] };
};

export const exportAuditLogs = async (filters: AuditFilters) => {
  const params = { ...filters } as any;
  const { data } = await axios.get('http://localhost:8000/api/audit/export', {
    params,
    responseType: 'blob',
  });
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'audit-export.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
