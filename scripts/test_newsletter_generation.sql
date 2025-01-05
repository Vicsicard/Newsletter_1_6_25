-- Comprehensive Newsletter Generation Test Script
-- This script tests the entire newsletter generation flow

-- Start transaction
BEGIN;

-- 1. Create test company and newsletter in one transaction
WITH new_company AS (
    INSERT INTO companies (
        company_name,
        industry,
        contact_email,
        target_audience,
        audience_description
    ) VALUES (
        'Test Company',
        'Technology',
        'test@example.com',
        'Software Developers',
        'Professional developers interested in AI and automation'
    ) RETURNING id, company_name, industry
)
INSERT INTO newsletters (
    company_id,
    subject,
    status,
    draft_status
) 
SELECT 
    id,
    'January 2025 Tech Newsletter',
    'draft',
    'draft'
FROM new_company
RETURNING id, company_id, subject, status, draft_status;

-- 4. Verify sections were created
SELECT section_number, section_type, status
FROM newsletter_sections
WHERE newsletter_id = (
    SELECT id FROM newsletters 
    WHERE subject = 'January 2025 Tech Newsletter'
    ORDER BY created_at DESC
    LIMIT 1
)
ORDER BY section_number;

-- 5. Verify queue items were created
SELECT section_type, status, attempts
FROM newsletter_generation_queue
WHERE newsletter_id = (
    SELECT id FROM newsletters 
    WHERE subject = 'January 2025 Tech Newsletter'
    ORDER BY created_at DESC
    LIMIT 1
)
ORDER BY section_number;

-- 6. Test status constraints
-- Should fail with error
DO $$
BEGIN
    UPDATE newsletters 
    SET draft_status = 'invalid_status' 
    WHERE subject = 'January 2025 Tech Newsletter'
    AND created_at = (SELECT MAX(created_at) FROM newsletters);
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'Status constraint working: invalid status rejected';
END $$;

-- 7. Update to valid status
UPDATE newsletters 
SET draft_status = 'draft_sent',  -- Valid draft_status from schema
    status = 'draft'  -- Valid status from schema
WHERE subject = 'January 2025 Tech Newsletter'
AND created_at = (SELECT MAX(created_at) FROM newsletters)
RETURNING id, subject, status, draft_status;

-- 8. Final verification of all relationships
WITH test_newsletter AS (
    SELECT n.*, c.company_name, c.industry
    FROM newsletters n
    JOIN companies c ON c.id = n.company_id
    WHERE n.subject = 'January 2025 Tech Newsletter'
    AND n.created_at = (SELECT MAX(created_at) FROM newsletters)
),
section_info AS (
    SELECT 
        COUNT(*) as section_count,
        array_agg(section_type ORDER BY section_number) as section_types
    FROM newsletter_sections
    WHERE newsletter_id = (SELECT id FROM test_newsletter)
),
queue_info AS (
    SELECT 
        COUNT(*) as queue_count,
        array_agg(status ORDER BY section_number) as queue_statuses
    FROM newsletter_generation_queue
    WHERE newsletter_id = (SELECT id FROM test_newsletter)
)
SELECT 
    n.*,
    si.section_count,
    si.section_types,
    qi.queue_count,
    qi.queue_statuses
FROM test_newsletter n
CROSS JOIN section_info si
CROSS JOIN queue_info qi;

-- Cleanup (comment out to keep test data)
ROLLBACK;
-- Or commit if you want to keep the test data
-- COMMIT;
