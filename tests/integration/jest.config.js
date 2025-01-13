/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./setup.ts'],
  testTimeout: 30000,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true
};
