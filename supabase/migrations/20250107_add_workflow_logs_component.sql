-- Add component column to workflow_logs table
ALTER TABLE workflow_logs ADD COLUMN IF NOT EXISTS component TEXT NOT NULL DEFAULT 'system';
