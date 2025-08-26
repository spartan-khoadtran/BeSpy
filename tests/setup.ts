// Jest setup file
import { logger, LogLevel } from '../src/utils/logger';

// Set log level to error during tests to reduce noise
logger.level = LogLevel.ERROR;

// Mock console methods in tests if needed
global.console = {
  ...console,
  // Uncomment to suppress console output in tests
  // log: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};