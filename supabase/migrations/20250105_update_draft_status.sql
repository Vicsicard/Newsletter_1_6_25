-- Drop existing constraint
ALTER TABLE newsletters DROP CONSTRAINT IF EXISTS newsletters_draft_status_check;

-- Add new constraint with 'generating' status
ALTER TABLE newsletters ADD CONSTRAINT newsletters_draft_status_check 
    CHECK (draft_status IN ('draft', 'draft_sent', 'pending_contacts', 'ready_to_send', 'sending', 'sent', 'failed', 'generating'));
