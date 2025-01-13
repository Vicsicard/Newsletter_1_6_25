# Complete Database Schema

## Overview
This document outlines the complete database schema for the newsletter application. The database is hosted on Supabase and uses PostgreSQL.

## Status Fields and Supabase Best Practices

This application follows Supabase's best practices by using TEXT fields for status values instead of ENUM types. This design choice provides several benefits:

1. Row Level Security (RLS):
   - Better compatibility with Supabase's RLS policies
   - More reliable policy evaluation
   - Easier to maintain security rules

2. API Integration:
   - Consistent TypeScript type generation
   - Predictable API behavior
   - Better type safety across the stack

3. Deployment Safety:
   - No table-locking ALTER TYPE commands
   - Safer database migrations
   - Easy to add new status values

4. Application-Level Validation:
   - Status values defined in TypeScript/JavaScript
   - Consistent validation across frontend/backend
   - Flexible constraint management

### Status Values Reference

newsletter.status:
- 'draft': Initial newsletter state
- 'scheduled': Ready for sending
- 'sending': Currently being sent
- 'sent': Successfully delivered
- 'failed': Sending failed

newsletter.draft_status:
- 'draft': Initial draft state
- 'sending': Draft being sent
- 'draft_sent': Draft successfully sent
- 'failed': Draft sending failed

newsletter_sections.status:
- 'pending': Ready for generation
- 'processing': Content being generated
- 'completed': Generation successful
- 'failed': Generation failed

newsletter_generation_queue.status:
- 'pending': Ready for processing
- 'processing': Currently generating
- 'completed': Successfully generated
- 'failed': Generation failed

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
    website_url VARCHAR(255),
    phone_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### newsletters
```sql
CREATE TABLE newsletters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    draft_status TEXT NOT NULL DEFAULT 'draft',
    draft_recipient_email TEXT,
    draft_sent_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    last_sent_status TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

The newsletters table includes monitoring fields for tracking email sending status:
- `sent_count`: Number of successful sends
- `failed_count`: Number of failed attempts
- `last_sent_status`: Status of the last send attempt
- `error_message`: Details of any errors encountered

Views depending on this table:
- `newsletter_status_monitor`: Detailed status monitoring
- `newsletter_health_check`: Aggregated metrics
- `system_health_dashboard`: System-wide health monitoring
```

### newsletter_sections
```sql
CREATE TABLE newsletter_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    newsletter_id UUID REFERENCES newsletters(id),
    section_number INTEGER NOT NULL,
    section_type TEXT NOT NULL DEFAULT 'welcome',
    title TEXT,
    content TEXT,
    image_prompt TEXT,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

The newsletter_sections table is designed for robust automated content generation:

Field Design Choices:
- `newsletter_id`: Nullable UUID for flexible section creation and temporary drafts
- `section_number`: NOT NULL INTEGER for maintaining section order
- `section_type`: TEXT with 'welcome' default for extensible section types
- `title`, `content`: TEXT fields, nullable to support async generation flow:
  - Start as NULL when section is created
  - Populated during content generation
  - No length limits to handle varied AI-generated content
- `image_prompt`, `image_url`: TEXT fields for optional image generation
- `status`: TEXT field with default 'pending' for flexible workflow:
  - 'pending': Initial state, ready for processing
  - 'processing': Currently being generated
  - 'completed': Successfully generated
  - 'failed': Generation failed
- `error_message`: TEXT field for detailed error tracking and recovery

Automation Benefits:
1. Asynchronous Processing:
   - Sections can be created before content exists
   - Status tracking for generation pipeline
   - Error handling for failed generations

2. Monitoring and Recovery:
   - Detailed error messages for debugging
   - Status tracking for system health
   - Timestamp fields for progress tracking

3. Flexible Content:
   - TEXT fields accommodate varying content lengths
   - No truncation of AI-generated content
   - Support for rich text if needed

4. Workflow Adaptability:
   - Status field can accommodate new states
   - Section types can be added without migration
   - Optional fields support various generation paths
```

### contacts
```sql
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### newsletter_generation_queue
```sql
CREATE TABLE newsletter_generation_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    newsletter_id UUID REFERENCES newsletters(id),
    section_type TEXT NOT NULL,
    section_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

The newsletter_generation_queue table is designed for resilient content generation:

Field Design Choices:
- `newsletter_id`: Nullable UUID for flexible queuing strategies:
  - Pre-generation of content before newsletter exists
  - Parallel processing workflows
  - Generic content that might be used across newsletters
- `section_type`: TEXT field for extensible section types:
  - No length limitations
  - Consistent with other tables
  - Future-proof for new section types
- `status`: TEXT field with default 'pending' for flexible workflow:
  - 'pending': Ready for processing
  - 'processing': Currently being generated
  - 'completed': Successfully finished
  - 'failed': Generation failed
  - Extensible for new states without migrations
- `attempts`: INTEGER with default 0 for retry logic:
  - Tracks generation attempts
  - Supports exponential backoff
  - Enables retry limit enforcement
- `error_message`: TEXT field for comprehensive error tracking:
  - Detailed error information
  - No length limit for error stacks
  - Supports error pattern analysis

Automation Benefits:
1. Resilient Processing:
   - Built-in retry mechanism
   - Comprehensive error tracking
   - Status monitoring for each stage
   - Automatic timestamp tracking

2. Flexible Workflows:
   - Support for pre-generation queuing
   - Parallel processing capability
   - Custom section types
   - Adaptable status workflow

3. Monitoring and Recovery:
   - Detailed error messages
   - Processing time tracking
   - Attempt counting
   - Stuck job detection

4. Future Adaptability:
   - New status values without migration
   - Extended section types
   - Modified retry strategies
   - Enhanced error tracking
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
