-- Create newsletter section types table
CREATE TABLE newsletter_section_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_type TEXT NOT NULL,
    display_name TEXT NOT NULL,
    prompt_template TEXT NOT NULL,
    section_number INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    company_id UUID REFERENCES companies(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (section_type, company_id) -- Allow same type across different companies
);

-- Add indexes for performance
CREATE INDEX idx_newsletter_section_types_company ON newsletter_section_types(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_newsletter_section_types_active ON newsletter_section_types(is_active) WHERE is_active = true;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_newsletter_section_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating timestamps
CREATE TRIGGER update_newsletter_section_types_updated_at
    BEFORE UPDATE ON newsletter_section_types
    FOR EACH ROW
    EXECUTE FUNCTION update_newsletter_section_types_updated_at();

-- Insert default section types
INSERT INTO newsletter_section_types 
(section_type, display_name, prompt_template, section_number, is_required, company_id)
VALUES 
(
    'welcome',
    'Welcome Message',
    'Write a welcoming introduction for a newsletter. Company: {company_name}. Industry: {industry}. Target Audience: {target_audience}. Make it engaging and professional, setting the tone for the newsletter.',
    1,
    true,
    NULL
),
(
    'industry_trends',
    'Industry Trends',
    'Write about current trends and innovations in the {industry} industry. Focus on developments relevant to {target_audience}. Include specific examples and their potential impact. Keep it informative and forward-looking.',
    2,
    true,
    NULL
),
(
    'practical_tips',
    'Practical Tips',
    'Provide practical tips and best practices for {target_audience} in the {industry} industry. Focus on actionable advice that addresses common challenges. Make recommendations specific and implementable.',
    3,
    true,
    NULL
);

-- Update the create_newsletter_with_sections function to use section types
CREATE OR REPLACE FUNCTION create_newsletter_with_sections(
    p_company_id UUID,
    p_subject TEXT,
    p_draft_recipient_email TEXT DEFAULT NULL,
    p_section_types TEXT[] DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_newsletter_id UUID;
    v_result JSONB;
    v_section_types TEXT[];
BEGIN
    -- Create the newsletter
    INSERT INTO newsletters (
        company_id,
        subject,
        status,
        draft_status,
        draft_recipient_email
    ) VALUES (
        p_company_id,
        p_subject,
        'draft',
        'draft',
        p_draft_recipient_email
    ) RETURNING id INTO v_newsletter_id;

    -- Determine which section types to use
    SELECT ARRAY_AGG(section_type ORDER BY section_number)
    INTO v_section_types
    FROM newsletter_section_types
    WHERE (company_id IS NULL OR company_id = p_company_id)
      AND is_active = true
      AND (
          is_required = true
          OR (p_section_types IS NOT NULL AND section_type = ANY(p_section_types))
      );

    -- Create queue items
    INSERT INTO newsletter_generation_queue (
        newsletter_id,
        section_type,
        section_number,
        status,
        attempts
    )
    SELECT 
        v_newsletter_id,
        nst.section_type,
        nst.section_number,
        'pending',
        0
    FROM newsletter_section_types nst
    WHERE (nst.company_id IS NULL OR nst.company_id = p_company_id)
      AND nst.is_active = true
      AND (
          nst.is_required = true
          OR (p_section_types IS NOT NULL AND nst.section_type = ANY(p_section_types))
      )
    ORDER BY nst.section_number;

    -- Create section placeholders
    INSERT INTO newsletter_sections (
        newsletter_id,
        section_number,
        section_type,
        status
    )
    SELECT 
        v_newsletter_id,
        nst.section_number,
        nst.section_type,
        'pending'
    FROM newsletter_section_types nst
    WHERE (nst.company_id IS NULL OR nst.company_id = p_company_id)
      AND nst.is_active = true
      AND (
          nst.is_required = true
          OR (p_section_types IS NOT NULL AND nst.section_type = ANY(p_section_types))
      )
    ORDER BY nst.section_number;

    -- Get the results using the existing check function
    SELECT check_newsletter_creation(v_newsletter_id) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
