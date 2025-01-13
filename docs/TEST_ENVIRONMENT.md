# Test Environment Documentation

## Overview
The test environment provides a consistent, isolated context for running tests in the newsletter application. It manages mock objects, test data, and environment cleanup to ensure reliable test execution.

## Key Components

### TestContext
The `TestContext` interface provides access to:
- Mocked Supabase client
- Mocked OpenAI client
- Mocked Logger
- Mock data storage
- Cleanup utilities

### TestEnvironment Class
A singleton class that manages the test environment lifecycle:
- Setup and teardown of test context
- Mock data management
- Environment variable control
- Mock state reset

## Usage

### Basic Test Setup
```typescript
describe('Your Test Suite', () => {
  let context: TestContext;
  
  beforeEach(async () => {
    context = await TestEnvironment.getInstance().setup();
  });

  afterEach(async () => {
    await TestEnvironment.getInstance().teardown();
  });

  it('your test case', async () => {
    // Your test code here
  });
});
```

### Managing Mock Data
```typescript
// Add mock data
await TestEnvironment.getInstance().addMockData('newsletters', {
  id: 'test-id',
  // ... other fields
});

// Clear specific mock data
await TestEnvironment.getInstance().clearMockData('newsletters');
```

### Setting Up Mock Responses
```typescript
context.supabase.from('newsletters').select.mockImplementation(() => ({
  eq: jest.fn().mockReturnValue({
    single: jest.fn().mockResolvedValue({
      data: mockData,
      error: null,
      status: 200,
      statusText: 'OK'
    })
  })
}));
```

## Best Practices

1. **Test Isolation**
   - Use fresh context for each test
   - Clean up after each test
   - Don't share state between tests

2. **Mock Data Management**
   - Use type-safe mock data
   - Clear mock data after each test
   - Use realistic test data structures

3. **Error Scenarios**
   - Test both success and error cases
   - Verify error handling
   - Check error messages and status codes

4. **Environment Variables**
   - Use test-specific environment variables
   - Reset environment after tests
   - Don't modify production environment variables

## Common Patterns

### Testing Database Operations
```typescript
it('should handle database operations', async () => {
  // Prepare test data
  const mockNewsletter = {
    id: 'test-id',
    status: 'pending'
  };

  // Add to mock data store
  await TestEnvironment.getInstance().addMockData('newsletters', mockNewsletter);

  // Set up mock response
  context.supabase.from('newsletters').select.mockImplementation(...);

  // Run your test
  const result = await yourFunction();

  // Verify results
  expect(result).toBeDefined();
  expect(context.supabase.from).toHaveBeenCalledWith('newsletters');
});
```

### Testing API Calls
```typescript
it('should handle API calls', async () => {
  // Set up OpenAI mock
  context.openai.chat.completions.create.mockResolvedValueOnce({
    id: 'test-completion',
    choices: [{
      message: {
        role: 'assistant',
        content: 'Test response'
      }
    }]
  });

  // Run your test
  const result = await yourFunction();

  // Verify results
  expect(result).toBeDefined();
  expect(context.openai.chat.completions.create).toHaveBeenCalled();
});
```

## Troubleshooting

### Common Issues

1. **Mock Not Called**
   - Verify mock setup in beforeEach
   - Check mock implementation
   - Ensure correct method chaining

2. **Test Data Not Available**
   - Verify addMockData call
   - Check data structure
   - Ensure teardown is not called prematurely

3. **Environment Variables**
   - Check global setup in beforeAll
   - Verify environment reset in afterAll
   - Ensure no conflicting environment variables
