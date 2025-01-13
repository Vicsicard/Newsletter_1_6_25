-- Test suite for newsletter section types functionality
BEGIN;

-- Clean up any test data
DELETE FROM newsletter_sections WHERE newsletter_id IN (
    SELECT id FROM newsletters WHERE subject LIKE 'Test Newsletter%'
);
DELETE FROM newsletter_generation_queue WHERE newsletter_id IN (
    SELECT id FROM newsletters WHERE subject LIKE 'Test Newsletter%'
);
DELETE FROM newsletters WHERE subject LIKE 'Test Newsletter%';
DELETE FROM newsletter_section_types WHERE company_id IN (
    SELECT id FROM companies WHERE company_name = 'Test Company'
);
DELETE FROM companies WHERE company_name = 'Test Company';

-- Test 1: Create company and verify default section types are accessible
INSERT INTO companies (company_name, industry, contact_email)
VALUES ('Test Company', 'Technology', 'test@example.com')
RETURNING id AS company_id \gset

DO $$
DECLARE
    section_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO section_count
    FROM newsletter_section_types
    WHERE company_id IS NULL;
    
    ASSERT section_count = 3, 'Expected 3 default section types';
END $$;

-- Test 2: Create company-specific section type
INSERT INTO newsletter_section_types (
    section_type,
    display_name,
    prompt_template,
    section_number,
    is_required,
    company_id
) VALUES (
    'company_updates',
    'Company Updates',
    'Write about recent updates at {company_name}',
    4,
    false,
    :'company_id'
);

-- Test 3: Create newsletter with mixed section types
SELECT create_newsletter_with_sections(
    :'company_id',
    'Test Newsletter with Custom Sections',
    'test@example.com',
    ARRAY['welcome', 'company_updates']
) AS result \gset

DO $$
DECLARE
    queue_count INTEGER;
    section_count INTEGER;
BEGIN
    -- Check queue items
    SELECT COUNT(*) INTO queue_count
    FROM newsletter_generation_queue
    WHERE newsletter_id = (SELECT id FROM newsletters WHERE subject = 'Test Newsletter with Custom Sections');
    
    -- Should have 2 items: welcome (required) and company_updates (selected)
    ASSERT queue_count = 2, 'Expected 2 queue items';
    
    -- Check newsletter sections
    SELECT COUNT(*) INTO section_count
    FROM newsletter_sections
    WHERE newsletter_id = (SELECT id FROM newsletters WHERE subject = 'Test Newsletter with Custom Sections');
    
    ASSERT section_count = 2, 'Expected 2 newsletter sections';
END $$;

-- Test 4: Verify section ordering
DO $$
DECLARE
    first_section TEXT;
    second_section TEXT;
BEGIN
    SELECT section_type INTO first_section
    FROM newsletter_generation_queue
    WHERE newsletter_id = (SELECT id FROM newsletters WHERE subject = 'Test Newsletter with Custom Sections')
    ORDER BY section_number
    LIMIT 1;
    
    SELECT section_type INTO second_section
    FROM newsletter_generation_queue
    WHERE newsletter_id = (SELECT id FROM newsletters WHERE subject = 'Test Newsletter with Custom Sections')
    ORDER BY section_number DESC
    LIMIT 1;
    
    ASSERT first_section = 'welcome', 'Expected welcome section to be first';
    ASSERT second_section = 'company_updates', 'Expected company_updates to be second';
END $$;

-- Test 5: Test required sections enforcement
SELECT create_newsletter_with_sections(
    :'company_id',
    'Test Newsletter Required Sections',
    'test@example.com',
    ARRAY['company_updates']  -- Only specify custom section
) AS result \gset

DO $$
DECLARE
    required_count INTEGER;
BEGIN
    -- Should include all required sections plus company_updates
    SELECT COUNT(*) INTO required_count
    FROM newsletter_generation_queue
    WHERE newsletter_id = (SELECT id FROM newsletters WHERE subject = 'Test Newsletter Required Sections')
    AND section_type IN (
        SELECT section_type 
        FROM newsletter_section_types 
        WHERE is_required = true
    );
    
    ASSERT required_count = 3, 'Expected all required sections to be included';
END $$;

ROLLBACK;
