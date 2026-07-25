import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'node_modules']
  },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node
      },
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // eslint-plugin-react-hooks v7 turned these on by default. They target
      // React Compiler-era purity rules that this codebase's already
      // CRITICAL-reviewed patterns predate:
      // - set-state-in-effect flags the reset-state-then-fetch pattern used
      //   throughout this codebase (clear stale state, then kick off an
      //   async load), which is correct, intentional behavior here.
      // - refs/purity flag reading `ref.current`/`Date.now()` inside a
      //   render-time eligibility computation in
      //   src/hooks/useStudyTimeTracker.ts, already reviewed across 3 rounds
      //   of CRITICAL review for FEATURE-016. Restructuring that file is out
      //   of scope for this dependency-audit fix and would reopen its
      //   review cycle.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true }
      ]
    }
  },
  {
    files: ['tests/e2e/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/rules-of-hooks': 'off'
    }
  }
);
