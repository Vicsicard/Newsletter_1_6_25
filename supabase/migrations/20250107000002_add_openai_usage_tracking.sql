-- Add OpenAI usage tracking to newsletter_sections table
ALTER TABLE newsletter_sections
ADD COLUMN IF NOT EXISTS openai_model text,
ADD COLUMN IF NOT EXISTS openai_tokens_used integer,
ADD COLUMN IF NOT EXISTS openai_prompt_tokens integer,
ADD COLUMN IF NOT EXISTS openai_completion_tokens integer;

-- Create view for OpenAI usage analytics
CREATE OR REPLACE VIEW openai_usage_metrics AS
SELECT 
    date_trunc('hour', updated_at) as time_bucket,
    openai_model,
    COUNT(*) as total_requests,
    SUM(openai_tokens_used) as total_tokens,
    SUM(openai_prompt_tokens) as total_prompt_tokens,
    SUM(openai_completion_tokens) as total_completion_tokens,
    ROUND(AVG(openai_tokens_used)::numeric, 2) as avg_tokens_per_request
FROM newsletter_sections
WHERE openai_tokens_used IS NOT NULL
GROUP BY time_bucket, openai_model
ORDER BY time_bucket DESC;
