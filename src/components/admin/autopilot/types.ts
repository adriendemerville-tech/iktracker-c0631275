// Types
export interface AuditLog {
  id: string;
  created_at: string;
  action: string;
  resource_type: string;
  resource_id: string;
  api_key_name: string | null;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  reverted: boolean;
  reverted_at: string | null;
}

export interface AutopilotEvent {
  id: string;
  audit_log_id: string | null;
  created_at: string;
  event_type: string;
  severity: string;
  page_key: string | null;
  message: string;
  details: Record<string, unknown> | null;
  resolved: boolean;
  resolved_at: string | null;
}

