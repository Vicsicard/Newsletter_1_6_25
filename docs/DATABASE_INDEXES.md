vercel deploy --prod]::text[]))
```

### Compiled Newsletter Status
```sql
CHECK (compiled_status = ANY(ARRAY[
    'draft',
    'ready',
    'sent',
    'error'
]::text[]))
```

## Database Constraints and Triggers

### Status Constraints

#### Newsletter Status
```sql
CHECK (status = ANY(ARRAY[
    'draft',
    'ready_to_send',
    'sending',
    'sent',
    'error'
]::text[]))
```

#### Newsletter Draft Status
```sql
CHECK (draft_status = ANY(ARRAY[
    'draft',
    'draft_sent',
    'pending_contacts',
    'ready_to_send',
    'sending',
    'sent',
    'failed',
    'generating'
]::text[]))
```

### Database Triggers

#### Newsletter Generation Trigger
```sql
-- Trigger: tr_create_newsletter_queue_items
-- Fires: AFTER INSERT ON newsletters
-- Purpose: Creates initial sections and queue items for new newsletters
CREATE TRIGGER tr_create_newsletter_queue_items
  AFTER INSERT ON newsletters
  FOR EACH ROW
  EXECUTE FUNCTION create_initial_queue_items();
```

The trigger function `create_initial_queue_items()` automatically creates:
1. Three newsletter sections (welcome, industry_trends, practical_tips)
2. Three corresponding queue items with pending status

## Indexes

### Database Indexes

## Overview
This document lists all database indexes used in the newsletter application to optimize query performance.

## Primary Key Indexes
All tables have automatically created primary key indexes on their `id` columns.

## Table-Specific Indexes

### companies
```sql
-- Primary key
CREATE UNIQUE INDEX companies_pkey ON companies(id);
-- Email index for lookups
CREATE INDEX idx_companies_contact_email ON companies(contact_email);
-- Industry index for filtering
CREATE INDEX idx_companies_industry ON companies(industry);
```

### newsletters
```sql
-- Primary key
CREATE UNIQUE INDEX newsletters_pkey ON newsletters(id);
-- Company relationship
CREATE INDEX idx_newsletters_company_id ON newsletters(company_id);
-- Status indexes for filtering
CREATE INDEX idx_newsletters_status ON newsletters(status);
CREATE INDEX idx_newsletters_draft_status ON newsletters(draft_status);
-- Draft recipient lookup
CREATE INDEX idx_newsletters_draft_recipient ON newsletters(draft_recipient_email);
```

### newsletter_sections
```sql
-- Primary key
CREATE UNIQUE INDEX newsletter_sections_pkey ON newsletter_sections(id);
-- Newsletter relationship
CREATE INDEX idx_newsletter_sections_newsletter_id ON newsletter_sections(newsletter_id);
-- Section ordering
CREATE UNIQUE INDEX idx_newsletter_sections_ordering 
ON newsletter_sections(newsletter_id, section_number);
-- Status filtering
CREATE INDEX idx_newsletter_sections_status ON newsletter_sections(status);
```

### contacts
```sql
-- Primary key
CREATE UNIQUE INDEX contacts_pkey ON contacts(id);
-- Company relationship
CREATE INDEX idx_contacts_company_id ON contacts(company_id);
-- Email uniqueness per company
CREATE UNIQUE INDEX idx_contacts_company_email 
ON contacts(company_id, email);
-- Status filtering
CREATE INDEX idx_contacts_status ON contacts(status);
```

### newsletter_generation_queue
```sql
-- Primary key
CREATE UNIQUE INDEX newsletter_generation_queue_pkey ON newsletter_generation_queue(id);
-- Newsletter relationship
CREATE INDEX idx_queue_newsletter_id ON newsletter_generation_queue(newsletter_id);
-- Status filtering
CREATE INDEX idx_queue_status ON newsletter_generation_queue(status);
-- Unique section per newsletter
CREATE UNIQUE INDEX idx_queue_newsletter_section 
ON newsletter_generation_queue(newsletter_id, section_type);
```

## Performance Notes

### Query Optimization
1. Always include indexed columns in WHERE clauses when possible
2. Use covering indexes for frequently accessed queries
3. Consider index order in compound indexes
4. Monitor index usage with pg_stat_user_indexes

### Maintenance
1. Regular ANALYZE to update statistics
2. Monitor index size and usage
3. Remove unused indexes
4. Consider partial indexes for specific queries

### Common Query Patterns
1. Newsletter lookup by company: Uses idx_newsletters_company_id
2. Contact filtering by status: Uses idx_contacts_status
3. Section ordering: Uses idx_newsletter_sections_ordering
4. Queue processing: Uses idx_queue_status
