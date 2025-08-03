// Global test setup
// Add any global test configuration here

// Example: extend Jest matchers
// import '@testing-library/jest-dom';

// Mock console.log for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
