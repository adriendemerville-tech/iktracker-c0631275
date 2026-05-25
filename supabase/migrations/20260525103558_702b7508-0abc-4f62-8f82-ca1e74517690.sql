-- Fix search_path on cleanup_expired_shares
CREATE OR REPLACE FUNCTION public.cleanup_expired_shares()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.report_shares WHERE expires_at < now();
END;
$function$;

-- Remove broad listing policies on blog-images public bucket (direct file URLs still work)
DROP POLICY IF EXISTS "Anyone can view blog images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view blog images by path" ON storage.objects;