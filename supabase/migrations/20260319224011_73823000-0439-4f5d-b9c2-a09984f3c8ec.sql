
-- Table for API audit logs with revert capability
CREATE TABLE public.api_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  action text NOT NULL, -- 'create', 'update', 'delete'
  resource_type text NOT NULL, -- 'post' or 'page'
  resource_id text NOT NULL, -- slug or page_key
  previous_data jsonb, -- snapshot before change (for revert)
  new_data jsonb, -- snapshot after change
  api_key_name text, -- which API key was used
  reverted boolean NOT NULL DEFAULT false,
  reverted_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.api_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read/manage audit logs
CREATE POLICY "Admins can manage audit logs"
  ON public.api_audit_logs FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
