'use strict';

const tseslint = require('typescript-eslint');

module.exports = [
  { ignores: ['dist/', 'node_modules/'] },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {},
  },
];
