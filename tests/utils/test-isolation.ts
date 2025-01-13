import { v4 as uuidv4 } from 'uuid';
import { createTestData } from './test-data';
import { Database } from '../../types/supabase';

type QueueItem = Database['public']['Tables']['newsletter_generation_queue']['Row'];
type Newsletter = Database['public']['Tables']['newsletters']['Row'];
type Company = Database['public']['Tables']['companies']['Row'];
type NewsletterSection = Database['public']['Tables']['newsletter_sections']['Row'];

/**
 * Creates an isolated test context with unique IDs for each entity
 * to prevent test interdependencies
 */
export function createIsolatedTestContext() {
  // Generate unique IDs for this test context
  const ids = {
    companyId: uuidv4(),
    newsletterId: uuidv4(),
    queueItemId: uuidv4(),
    sectionId: uuidv4(),
  };

  // Create test data with unique IDs
  const testData = {
    company: createTestData.company({
      id: ids.companyId,
    }),
    newsletter: createTestData.newsletter({
      id: ids.newsletterId,
      company_id: ids.companyId,
    }),
    queueItem: createTestData.queueItem({
      id: ids.queueItemId,
      newsletter_id: ids.newsletterId,
    }),
    section: createTestData.newsletterSection({
      id: ids.sectionId,
      newsletter_id: ids.newsletterId,
    }),
  };

  return {
    ids,
    testData,
    // Helper to create additional entities with the same context
    createAdditionalQueueItem: (overrides: Partial<QueueItem> = {}) => 
      createTestData.queueItem({
        id: uuidv4(),
        newsletter_id: ids.newsletterId,
        ...overrides,
      }),
    createAdditionalNewsletter: (overrides: Partial<Newsletter> = {}) =>
      createTestData.newsletter({
        id: uuidv4(),
        company_id: ids.companyId,
        ...overrides,
      }),
    createAdditionalSection: (overrides: Partial<NewsletterSection> = {}) =>
      createTestData.newsletterSection({
        id: uuidv4(),
        newsletter_id: ids.newsletterId,
        ...overrides,
      }),
  };
}
