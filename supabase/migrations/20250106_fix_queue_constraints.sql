-- Fix queue constraints and add retry mechanism
-- Add CHECK constraints for section_type and status
ALTER TABLE newsletter_generation_queue
ADD CONSTRAINT check_section_type 
CHECK (section_type IN ('welcome', 'industry_trends', 'practical_tips')),
ADD CONSTRAINT check_status 
CHECK (status IN ('pending', 'in_progress', 'completed', 'failed'));

-- Add retry mechanism columns
ALTER TABLE newsletter_generation_queue
ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS retry_after TIMESTAMPTZ;

-- Update acquire_next_queue_item function to handle retry cooldown
CREATE OR REPLACE FUNCTION acquire_next_queue_item()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  item_record record;
BEGIN
  -- Lock the row and get the next pending item that's ready for processing
  WITH next_item AS (
    SELECT *
    FROM newsletter_generation_queue
    WHERE status = 'pending'
      AND (retry_after IS NULL OR retry_after <= NOW())
      AND attempts < max_attempts
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  UPDATE newsletter_generation_queue q
  SET 
    status = 'in_progress',
    attempts = attempts + 1,
    retry_after = CASE 
      -- Exponential backoff: 2^attempts minutes
      WHEN attempts > 0 THEN NOW() + (INTERVAL '1 minute' * POWER(2, attempts))
      ELSE NULL
    END,
    updated_at = NOW()
  FROM next_item
  WHERE q.id = next_item.id
  RETURNING q.* INTO item_record;

  -- Return null if no item found
  IF item_record IS NULL THEN
    RETURN NULL;
  END IF;

  -- Return the item as JSON
  RETURN row_to_json(item_record)::jsonb;
END;
$$;

-- Update error handling function
CREATE OR REPLACE FUNCTION handle_queue_item_error(
  item_id UUID,
  error_msg TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE newsletter_generation_queue
  SET 
    status = CASE 
      WHEN attempts >= max_attempts THEN 'failed'
      ELSE 'pending'
    END,
    error_message = error_msg,
    updated_at = NOW()
  WHERE id = item_id;
END;
$$;

-- Add index for retry mechanism
CREATE INDEX IF NOT EXISTS idx_queue_retry_after ON newsletter_generation_queue(retry_after)
WHERE retry_after IS NOT NULL;

-- Add index for attempts
CREATE INDEX IF NOT EXISTS idx_queue_attempts ON newsletter_generation_queue(attempts)
WHERE attempts > 0;
