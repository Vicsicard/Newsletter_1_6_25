-- Create a function to handle newsletter creation with sections in a transaction
CREATE OR REPLACE FUNCTION create_newsletter_with_sections(
  p_company_id UUID,
  p_subject TEXT,
  p_draft_recipient_email TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_newsletter_id UUID;
  v_newsletter JSONB;
BEGIN
  -- Start transaction implicitly
  
  -- Create the newsletter
  INSERT INTO newsletters (
    company_id,
    subject,
    status,
    draft_status,
    draft_recipient_email,
    sent_count,
    failed_count
  ) VALUES (
    p_company_id,
    p_subject,
    'draft',
    'draft',
    p_draft_recipient_email,
    0,
    0
  ) RETURNING id INTO v_newsletter_id;

  -- Create queue items for each section type
  INSERT INTO newsletter_generation_queue (
    newsletter_id,
    section_type,
    section_number,
    status,
    attempts
  )
  VALUES 
    (v_newsletter_id, 'welcome', 1, 'pending', 0),
    (v_newsletter_id, 'updates', 2, 'pending', 0),
    (v_newsletter_id, 'insights', 3, 'pending', 0);

  -- Create initial section placeholders
  INSERT INTO newsletter_sections (
    newsletter_id,
    section_number,
    title,
    content,
    status
  )
  VALUES 
    (v_newsletter_id, 1, '', '', 'pending'),
    (v_newsletter_id, 2, '', '', 'pending'),
    (v_newsletter_id, 3, '', '', 'pending');

  -- Get the created newsletter with its details
  SELECT jsonb_build_object(
    'id', n.id,
    'company_id', n.company_id,
    'subject', n.subject,
    'status', n.status,
    'draft_status', n.draft_status,
    'created_at', n.created_at
  ) INTO v_newsletter
  FROM newsletters n
  WHERE n.id = v_newsletter_id;

  RETURN v_newsletter;
  -- Transaction commits automatically if we reach here
  -- Rolls back automatically if any error occurs
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
