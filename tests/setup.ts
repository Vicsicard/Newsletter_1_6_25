import { jest } from '@jest/globals';
import { resetTestState } from './utils/test-cleanup';

// Set up Jest timers
jest.useFakeTimers();

const testTimeout = 30000;
jest.setTimeout(testTimeout);

// Clean state and reset mocks before each test
beforeEach(() => {
  // Reset all mocks
  jest.clearAllMocks();
  resetTestState();
});

// Add timeout handling for async operations
beforeAll(() => {
  // Increase timeout for setup operations
  jest.setTimeout(30000);
});

afterAll(() => {
  // Reset timeout to default
  jest.setTimeout(testTimeout);
});
