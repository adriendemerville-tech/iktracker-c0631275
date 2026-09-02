CREATE TABLE public.ui_layouts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  layout_key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, layout_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ui_layouts TO authenticated;
GRANT ALL ON public.ui_layouts TO service_role;

ALTER TABLE public.ui_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own layouts"
ON public.ui_layouts
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_ui_layouts_updated_at
BEFORE UPDATE ON public.ui_layouts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();