-- Test company creation
-- First, let's make sure we don't have test data
DELETE FROM companies 
WHERE company_name IN ('Test Company Inc.', 'Minimal Test Company');

-- Now test company creation with all fields
WITH new_company AS (
    INSERT INTO companies (
        company_name,
        industry,
        target_audience,
        audience_description,
        contact_email,
        contact_name
    ) VALUES (
        'Test Company Inc.',
        'Technology',
        'Small Business Owners',
        'Small business owners looking to improve their digital presence',
        'contact@testcompany.com',
        'John Doe'
    ) RETURNING *
)
SELECT 
    id,
    company_name,
    industry,
    target_audience,
    audience_description,
    contact_email,
    contact_name,
    created_at,
    updated_at
FROM new_company;

-- Verify the company was created correctly
SELECT 
    id,
    company_name,
    industry,
    target_audience,
    audience_description,
    contact_email,
    contact_name,
    created_at,
    updated_at
FROM companies
WHERE company_name = 'Test Company Inc.';

-- Test company creation with minimal required fields
WITH minimal_company AS (
    INSERT INTO companies (
        company_name,
        industry,
        contact_email
    ) VALUES (
        'Minimal Test Company',
        'Retail',
        'minimal@testcompany.com'
    ) RETURNING *
)
SELECT * FROM minimal_company;

-- Verify the minimal company was created correctly
SELECT 
    id,
    company_name,
    industry,
    target_audience,
    audience_description,
    contact_email,
    contact_name,
    created_at,
    updated_at
FROM companies
WHERE company_name = 'Minimal Test Company';

-- Verify constraints
-- This should fail (duplicate company_name)
INSERT INTO companies (
    company_name,
    industry,
    contact_email
) VALUES (
    'Test Company Inc.',
    'Technology',
    'another@testcompany.com'
);

-- This should fail (missing required field industry)
INSERT INTO companies (
    company_name,
    contact_email
) VALUES (
    'Failed Test Company',
    'failed@testcompany.com'
);

-- This should fail (missing required field contact_email)
INSERT INTO companies (
    company_name,
    industry
) VALUES (
    'Failed Test Company',
    'Technology'
);

-- Verification queries
SELECT * FROM companies WHERE company_name = 'Test Company Inc.';
SELECT * FROM companies WHERE company_name = 'Minimal Test Company';

-- Cleanup test data when needed
-- DELETE FROM companies 
-- WHERE company_name IN ('Test Company Inc.', 'Minimal Test Company');
