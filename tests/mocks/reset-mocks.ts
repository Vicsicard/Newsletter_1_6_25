import { jest } from '@jest/globals';
import { mockSupabase } from './supabase-mock';
import { createMockOpenAI } from './openai';

/**
 * Reset all mock implementations between tests
 */
export function resetAllMocks() {
  // Reset all Jest mocks
  jest.clearAllMocks();
  jest.resetAllMocks();
  jest.restoreAllMocks();
  
  // Reset OpenAI mock
  const mockOpenAI = createMockOpenAI();
  jest.spyOn(mockOpenAI.chat.completions, 'create').mockReset();
  
  // Reset Supabase mock data
  jest.spyOn(mockSupabase, 'from').mockReset();
  jest.spyOn(mockSupabase, 'rpc').mockReset();
  
  // Reset any mock timers
  jest.clearAllTimers();
}
