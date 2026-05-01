UPDATE public.partner_api_keys
SET scopes = array_append(scopes, 'reports')
WHERE partner_name = 'dictadevi'
  AND NOT ('reports' = ANY(scopes));