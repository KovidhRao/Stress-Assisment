/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.jest.json'
    }
  },
  moduleNameMapper: {
    // Resolves @/ path alias to the project root
    '^@/(.*)$': '<rootDir>/$1'
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx'
  ],
  // Ignore Next.js build output and node_modules
  testPathIgnorePatterns: ['/node_modules/', '/.next/']
}

module.exports = config
