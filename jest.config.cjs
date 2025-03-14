module.exports = {
  transform: {},
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  testRunner: 'jest-circus/runner',
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  setupFiles: ['./jest.setup.cjs'],
  moduleNameMapper: {
    '^../build/services/command-service.js$': '<rootDir>/jest.setup.cjs',
    '^../build/utils/platform-utils.js$': '<rootDir>/jest.setup.cjs'
  }
};