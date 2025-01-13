import { jest } from '@jest/globals';
import type { NewsletterSectionContent } from '../../types/email';

// Define the type for generateNewsletter function
type GenerateNewsletterFn = (
  newsletterId: string,
  customPrompt?: string,
  companyInfo?: {
    companyName: string;
    industry: string;
    targetAudience?: string;
    audienceDescription?: string;
  }
) => Promise<NewsletterSectionContent[]>;

type ValidateOpenAIKeyFn = () => Promise<boolean>;
type GenerateImageFn = (prompt: string) => Promise<string>;

// Create properly typed mock functions
export const generateNewsletter = jest.fn<GenerateNewsletterFn>();
export const validateOpenAIKey = jest.fn<ValidateOpenAIKeyFn>().mockResolvedValue(true);

// OpenAI API response types
interface OpenAIListResponse {
  data: any[];
}

interface OpenAIChatResponse {
  id: string;
  choices: Array<{ message: { content: string } }>;
  created: number;
  model: string;
}

interface OpenAIImageResponse {
  created: number;
  data: Array<{ url: string }>;
}

type OpenAIListFn = () => Promise<OpenAIListResponse>;
type OpenAIChatCreateFn = () => Promise<OpenAIChatResponse>;
type OpenAIImageGenerateFn = () => Promise<OpenAIImageResponse>;

// Create properly typed OpenAI mocks
export const mockOpenAI = {
  models: {
    list: jest.fn<OpenAIListFn>().mockResolvedValue({ data: [] })
  },
  chat: {
    completions: {
      create: jest.fn<OpenAIChatCreateFn>().mockResolvedValue({
        id: 'test-id',
        choices: [{ message: { content: 'Test content' } }],
        created: Date.now(),
        model: 'gpt-3.5-turbo'
      })
    }
  },
  images: {
    generate: jest.fn<OpenAIImageGenerateFn>().mockResolvedValue({
      created: Date.now(),
      data: [{ url: 'https://example.com/image.jpg' }]
    })
  }
};

export const generateImage = jest.fn<GenerateImageFn>().mockResolvedValue('https://example.com/image.jpg');

export const mockNewsletterModule = {
  generateNewsletter,
  validateOpenAIKey
};
