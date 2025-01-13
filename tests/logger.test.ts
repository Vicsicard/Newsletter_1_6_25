import { Logger } from '../src/utils/logger';

describe('Logger', () => {
  let mockSupabase: any;
  let logger: Logger;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis()
    };

    mockSupabase.from.mockImplementation(() => ({
      insert: (data: any) => ({
        select: () => ({
          single: () => Promise.resolve({
            data: { id: 'test-log-id', ...data },
            error: null
          })
        })
      })
    }));

    logger = new Logger(mockSupabase, 'TestComponent');
  });

  describe('info', () => {
    it('should log info message successfully', async () => {
      const message = 'Test info message';
      const data = { key: 'value' };

      const result = await logger.info(message, data);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('workflow_logs');
    });

    it('should handle database errors', async () => {
      const message = 'Test info message';
      const data = { key: 'value' };

      mockSupabase.from.mockImplementation(() => ({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: null,
              error: new Error('Database error')
            })
          })
        })
      }));

      const result = await logger.info(message, data);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Database error');
    });
  });

  describe('error', () => {
    it('should log error message successfully', async () => {
      const message = 'Test error message';
      const data = { key: 'value' };

      const result = await logger.error(message, data);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('workflow_logs');
    });

    it('should handle database errors', async () => {
      const message = 'Test error message';
      const data = { key: 'value' };

      mockSupabase.from.mockImplementation(() => ({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: null,
              error: new Error('Database error')
            })
          })
        })
      }));

      const result = await logger.error(message, data);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Database error');
    });
  });

  describe('warn', () => {
    it('should log warning message successfully', async () => {
      const message = 'Test warning message';
      const data = { key: 'value' };

      const result = await logger.warn(message, data);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('workflow_logs');
    });

    it('should handle database errors', async () => {
      const message = 'Test warning message';
      const data = { key: 'value' };

      mockSupabase.from.mockImplementation(() => ({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: null,
              error: new Error('Database error')
            })
          })
        })
      }));

      const result = await logger.warn(message, data);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Database error');
    });
  });
});
