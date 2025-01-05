-- Update the draft_status check constraint to include 'generating' status
ALTER TABLE newsletters DROP CONSTRAINT IF EXISTS newsletters_draft_status_check;
ALTER TABLE newsletters ADD CONSTRAINT newsletters_draft_status_check 
    CHECK (draft_status IN ('draft', 'draft_sent', 'pending_contacts', 'ready_to_send', 'sending', 'sent', 'failed', 'generating'));
