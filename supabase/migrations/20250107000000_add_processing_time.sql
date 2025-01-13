-- Add processing time tracking field to newsletter_generation_queue table
ALTER TABLE newsletter_generation_queue
ADD COLUMN IF NOT EXISTS processing_duration_ms integer;
