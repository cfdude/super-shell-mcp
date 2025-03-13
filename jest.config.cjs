module.exports = {
  transform: {},
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  testRunner: 'jest-circus/runner',
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
};