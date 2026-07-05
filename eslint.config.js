const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'supabase/**', '_temp_*', '**/.next/**', 'backend/**', 'apps/admin/**'],
  },
  {
    rules: {
      'react/display-name': 'off',
    },
  },
]);
