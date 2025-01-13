-- Add performance tracking fields to newsletter_generation_queue table
ALTER TABLE newsletter_generation_queue
ADD COLUMN IF NOT EXISTS processing_start_time timestamptz,
ADD COLUMN IF NOT EXISTS processing_end_time timestamptz,
ADD COLUMN IF NOT EXISTS processing_duration_ms integer,
ADD COLUMN IF NOT EXISTS openai_tokens_used integer,
ADD COLUMN IF NOT EXISTS openai_model_used text;

-- Create performance_metrics table for aggregated metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name text NOT NULL,
    metric_value numeric NOT NULL,
    metric_unit text NOT NULL,
    metric_timestamp timestamptz NOT NULL DEFAULT now(),
    component text NOT NULL,
    context jsonb
);

-- Create indexes for performance querying
CREATE INDEX IF NOT EXISTS idx_queue_processing_time 
ON newsletter_generation_queue(processing_start_time, processing_end_time);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_timestamp 
ON performance_metrics(metric_name, metric_timestamp);

-- Create function to calculate processing duration
CREATE OR REPLACE FUNCTION calculate_processing_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.processing_end_time IS NOT NULL AND NEW.processing_start_time IS NOT NULL THEN
        NEW.processing_duration_ms := 
            EXTRACT(EPOCH FROM (NEW.processing_end_time - NEW.processing_start_time)) * 1000;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate duration
DROP TRIGGER IF EXISTS tr_calculate_processing_duration ON newsletter_generation_queue;
CREATE TRIGGER tr_calculate_processing_duration
    BEFORE UPDATE ON newsletter_generation_queue
    FOR EACH ROW
    EXECUTE FUNCTION calculate_processing_duration();

-- Create view for performance analysis
CREATE OR REPLACE VIEW queue_performance_metrics AS
SELECT 
    date_trunc('hour', processing_start_time) as time_bucket,
    COUNT(*) as total_processed,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
    COUNT(CASE WHEN status = 'error' THEN 1 END) as failed,
    ROUND(AVG(processing_duration_ms)::numeric, 2) as avg_duration_ms,
    ROUND(MIN(processing_duration_ms)::numeric, 2) as min_duration_ms,
    ROUND(MAX(processing_duration_ms)::numeric, 2) as max_duration_ms,
    SUM(openai_tokens_used) as total_tokens_used,
    COUNT(DISTINCT openai_model_used) as models_used
FROM newsletter_generation_queue
WHERE processing_start_time IS NOT NULL
GROUP BY time_bucket
ORDER BY time_bucket DESC;
