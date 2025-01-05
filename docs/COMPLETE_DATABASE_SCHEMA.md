# Complete Database Schema

## Overview
This document outlines the complete database schema for the newsletter application. The database is hosted on Supabase and uses PostgreSQL.

## Tables

### companies
```sql
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100) NOT NULL,
    target_audience VARCHAR(255),
    audience_description TEXT,
    contact_email VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### newsletters
```sql
CREATE TABLE newsletters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    subject VARCHAR(255) NOT NULL,
    status newsletter_status NOT NULL DEFAULT 'draft',
    draft_status newsletter_draft_status NOT NULL DEFAULT 'draft',
    draft_recipient_email VARCHAR(255),
    draft_sent_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### newsletter_sections
```sql
CREATE TABLE newsletter_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    newsletter_id UUID NOT NULL REFERENCES newsletters(id),
    section_number INTEGER NOT NULL,
    section_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_prompt TEXT,
    image_url TEXT,
    status newsletter_section_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### contacts
```sql
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    status contact_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### newsletter_generation_queue
```sql
CREATE TABLE newsletter_generation_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    newsletter_id UUID NOT NULL REFERENCES newsletters(id),
    section_type VARCHAR(50) NOT NULL,
    section_number INTEGER NOT NULL,
    status queue_status NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Enums

### newsletter_status
```sql
CREATE TYPE newsletter_status AS ENUM (
    'draft',
    'scheduled',
    'sending',
    'sent',
    'failed'
);
```

### newsletter_draft_status
```sql
CREATE TYPE newsletter_draft_status AS ENUM (
    'draft',
    'sending',
    'draft_sent',
    'failed'
);
```

### newsletter_section_status
```sql
CREATE TYPE newsletter_section_status AS ENUM (
    'pending',
    'generating',
    'active',
    'failed'
);
```

### contact_status
```sql
CREATE TYPE contact_status AS ENUM (
    'active',
    'unsubscribed',
    'bounced',
    'complained'
);
```

### queue_status
```sql
CREATE TYPE queue_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
);
```

## Indexes
See [DATABASE_INDEXES.md](DATABASE_INDEXES.md) for a complete list of database indexes.

## Relationships
- `newsletters.company_id` → `companies.id`
- `newsletter_sections.newsletter_id` → `newsletters.id`
- `contacts.company_id` → `companies.id`
- `newsletter_generation_queue.newsletter_id` → `newsletters.id`

## Triggers
1. `update_timestamps`: Updates `updated_at` on any record modification
2. `create_newsletter_sections`: Creates default sections when a newsletter is created
3. `handle_contact_status`: Updates related records when contact status changes

## Notes
- All timestamps use UTC timezone
- UUIDs are used for all primary keys
- Soft deletes are not implemented (records are permanently deleted)
