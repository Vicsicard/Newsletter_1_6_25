-- Add success/failure tracking view
CREATE OR REPLACE VIEW queue_success_rates AS
WITH stats AS (
  SELECT
    date_trunc('hour', last_attempt_at) as time_bucket,
    COUNT(*) as total_attempts,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_attempts,
    COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_attempts
  FROM newsletter_generation_queue
  WHERE last_attempt_at IS NOT NULL
  GROUP BY time_bucket
)
SELECT
  time_bucket,
  total_attempts,
  successful_attempts,
  failed_attempts,
  ROUND((successful_attempts::numeric / NULLIF(total_attempts, 0) * 100)::numeric, 2) as success_rate,
  ROUND((failed_attempts::numeric / NULLIF(total_attempts, 0) * 100)::numeric, 2) as failure_rate
FROM stats
ORDER BY time_bucket DESC;
