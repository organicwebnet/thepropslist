module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-var-requires': 'error',
    'no-undef': 'error',
    'no-empty': 'error',
    'no-useless-escape': 'error',
    '@typescript-eslint/no-inferrable-types': 'error',
  },
  ignorePatterns: [
    'lib/**/*',
    'node_modules/**/*',
    '*.js',
    '*.cjs',
    'functions-standalone/**/*',
    'standalone-*.js',
  ],
};
