/* eslint-env node */
module.exports = {
  extends: [
    'eslint:recommended',
    '@electron-toolkit',
    '@electron-toolkit/eslint-config-ts/eslint-recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
  }
}
