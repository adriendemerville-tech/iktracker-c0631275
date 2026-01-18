-- Create table for temporary report shares
CREATE TABLE public.report_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  html_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accessed_count INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.report_shares ENABLE ROW LEVEL SECURITY;

-- Users can create their own shares
CREATE POLICY "Users can create their own shares" 
ON public.report_shares 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Anyone can view non-expired shares (for public access via link)
CREATE POLICY "Anyone can view non-expired shares" 
ON public.report_shares 
FOR SELECT 
USING (expires_at > now());

-- Users can delete their own shares
CREATE POLICY "Users can delete their own shares" 
ON public.report_shares 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_report_shares_expires_at ON public.report_shares(expires_at);

-- Create function to cleanup expired shares (can be called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_shares()
RETURNS void AS $$
BEGIN
  DELETE FROM public.report_shares WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;