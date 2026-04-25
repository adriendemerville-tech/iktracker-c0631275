ALTER TABLE public.api_audit_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.api_audit_logs;