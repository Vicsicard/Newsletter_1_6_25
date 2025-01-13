import OpenAI from 'openai';

export interface MockOpenAIInterface extends OpenAI {
  setMockResponse(response: any): void;
  setMockError(error: Error): void;
}

class MockCompletions {
  private mockResponse: any;
  private mockError: Error | null = null;
  _client: OpenAI;

  constructor(client: OpenAI) {
    this._client = client;
  }

  create = async () => {
    if (this.mockError) {
      throw this.mockError;
    }
    return this.mockResponse || {
      id: 'mock-completion-id',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Generated content for test'
          },
          finish_reason: 'stop'
        }
      ]
    };
  };

  setMockResponse(response: any) {
    this.mockResponse = response;
  }

  setMockError(error: Error) {
    this.mockError = error;
  }
}

// Create a base class for resources that require _client
class MockResource {
  _client: OpenAI;
  constructor(client: OpenAI) {
    this._client = client;
  }
}

// Create mock implementations for each OpenAI resource
class MockFiles extends MockResource {
  create = async () => ({});
  retrieve = async () => ({});
  list = async () => ({});
  del = async () => ({});
}

class MockImages extends MockResource {
  createVariation = async () => ({});
  edit = async () => ({});
  generate = async () => ({});
}

class MockAudio extends MockResource {
  transcriptions = {
    create: async () => ({})
  };
  translations = {
    create: async () => ({})
  };
  speech = {
    create: async () => ({})
  };
}

class MockModerations extends MockResource {
  create = async () => ({});
}

class MockEmbeddings extends MockResource {
  create = async () => ({});
}

export class MockOpenAI extends OpenAI {
  // Create instances of mock resources
  private mockCompletions = new MockCompletions(this);
  private mockFiles = new MockFiles(this);
  private mockImages = new MockImages(this);
  private mockAudio = new MockAudio(this);
  private mockModerations = new MockModerations(this);
  private mockEmbeddings = new MockEmbeddings(this);

  constructor() {
    super({
      apiKey: 'mock-api-key',
      organization: 'mock-org',
      baseURL: 'https://api.openai.com/v1'
    });
  }

  // Mock the chat property
  readonly chat = {
    completions: this.mockCompletions
  } as unknown as OpenAI['chat'];

  // Mock other required properties with proper implementations
  readonly files = this.mockFiles as unknown as OpenAI['files'];
  readonly images = this.mockImages as unknown as OpenAI['images'];
  readonly audio = this.mockAudio as unknown as OpenAI['audio'];
  readonly moderations = this.mockModerations as unknown as OpenAI['moderations'];
  readonly embeddings = this.mockEmbeddings as unknown as OpenAI['embeddings'];
  readonly completions = this.mockCompletions as unknown as OpenAI['completions'];

  // Expose mock control methods
  setMockResponse(response: any) {
    this.mockCompletions.setMockResponse(response);
  }

  setMockError(error: Error) {
    this.mockCompletions.setMockError(error);
  }
}

// Create a mock OpenAI instance
export const createMockOpenAI = (): MockOpenAIInterface => {
  return new MockOpenAI() as unknown as MockOpenAIInterface;
};
