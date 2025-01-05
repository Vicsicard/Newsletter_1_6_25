-- Create tables with proper indexes as defined in DATABASE_INDEXES.md

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    industry TEXT NOT NULL,
    target_audience TEXT,
    audience_description TEXT,
    contact_email TEXT NOT NULL,
    website_url TEXT, -- Accepts any text format, no URL validation required
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Newsletters table
CREATE TABLE IF NOT EXISTS newsletters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    subject TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    draft_status TEXT DEFAULT 'draft',
    draft_recipient_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints for status fields
ALTER TABLE newsletters
    ADD CONSTRAINT newsletters_status_check 
    CHECK (status IN ('draft', 'published', 'archived')),
    ADD CONSTRAINT newsletters_draft_status_check 
    CHECK (draft_status IN ('draft', 'draft_sent', 'pending_contacts', 'ready_to_send', 'sending', 'sent', 'failed', 'generating'));

CREATE INDEX IF NOT EXISTS idx_newsletters_draft_status ON newsletters(draft_status);
CREATE INDEX IF NOT EXISTS idx_newsletters_draft_recipient ON newsletters(draft_recipient_email);

-- Newsletter Sections table
CREATE TABLE IF NOT EXISTS newsletter_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    newsletter_id UUID REFERENCES newsletters(id),
    section_number INTEGER NOT NULL,
    section_type TEXT NOT NULL DEFAULT 'welcome',
    title TEXT,
    content TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT newsletter_sections_status_check 
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed'))
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    email TEXT NOT NULL,
    name TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, email)
);

-- Newsletter Contacts table
CREATE TABLE IF NOT EXISTS newsletter_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    newsletter_id UUID REFERENCES newsletters(id),
    contact_id UUID REFERENCES contacts(id),
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(newsletter_id, contact_id)
);

CREATE INDEX IF NOT EXISTS newsletter_contacts_contact_id_idx ON newsletter_contacts(contact_id);
CREATE INDEX IF NOT EXISTS newsletter_contacts_newsletter_id_idx ON newsletter_contacts(newsletter_id);

-- CSV Uploads table
CREATE TABLE IF NOT EXISTS csv_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    filename TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Image Generation History table
CREATE TABLE IF NOT EXISTS image_generation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    newsletter_section_id UUID REFERENCES newsletter_sections(id),
    prompt TEXT NOT NULL,
    result_url TEXT,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_image_generation_newsletter_section ON image_generation_history(newsletter_section_id);
