-- Add response columns to feedback table
ALTER TABLE public.feedback 
ADD COLUMN response TEXT,
ADD COLUMN responded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN read_by_user BOOLEAN DEFAULT false;

-- Allow users to update their own feedback (to mark as read)
CREATE POLICY "Users can update their own feedback" 
ON public.feedback 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);