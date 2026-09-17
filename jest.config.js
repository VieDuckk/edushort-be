module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],

  rootDir: '.',

  testRegex: '.*\\.spec\\.ts$',

  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },

  moduleNameMapper: {
    '^prisma/(.*)$': '<rootDir>/prisma/$1',
  },

  // @nestjs/* v12 packages ship as ESM-only; transform them instead of
  // letting Jest try to require() raw ESM in CJS mode.
  transformIgnorePatterns: [
    'node_modules/(?!(@nestjs/jwt|@nestjs/config)/)',
  ],

  collectCoverageFrom: ['**/*.(t|j)s'],

  coverageDirectory: './coverage',

  testEnvironment: 'node',
};
