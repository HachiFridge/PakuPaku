// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'out/',
      'dist/',
      '**/*.d.ts',
      'webviews/', // Webviews specific linting can be added later or separate
      'node_modules/'
    ]
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'import',
          format: ['camelCase', 'PascalCase']
        }
      ],
      // Formatter rules should be handled by Prettier or @stylistic
      // '@typescript-eslint/semi': 'warn',
      'curly': 'warn',
      'eqeqeq': 'warn',
      '@typescript-eslint/only-throw-error': 'warn',
      'semi': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  }
);
