const path = require('path');

module.exports = {
    parserOptions: {
        ecmaVersion: 9,
        sourceType: 'module',
        ecmaFeatures: {
            modules: true,
        },
    },
    extends: ['prettier'],
    plugins: ['prettier', '@typescript-eslint'],
    parser: '@typescript-eslint/parser',
    ignorePatterns: ['node_modules/', 'dist/', 'coverage/', 'perf/'],
    rules: {
        'sort-keys': 'off',
        // 'no-console': ['error', { allow: ['warn', 'error'] }],
        'prefer-arrow/prefer-arrow-functions': 'off',
        'prefer-rest-params': 'off',
        'prettier/prettier': [
            'error',
            {
                singleQuote: true,
                arrowParens: 'always',
                tabWidth: 4,
                trailingComma: 'all',
            },
        ],
    },

    overrides: [
        {
            files: ['*.ts', '*.tsx'],
            parser: '@typescript-eslint/parser',
            plugins: ['@typescript-eslint'],
            extends: ['plugin:@typescript-eslint/recommended', 'prettier'],
            rules: {
                '@typescript-eslint/explicit-module-boundary-types': 'off',
                '@typescript-eslint/no-use-before-define': 'off',
                '@typescript-eslint/ban-types': 'off',
                '@typescript-eslint/ban-ts-comment': 'off',
                '@typescript-eslint/member-ordering': 'off',
                '@typescript-eslint/explicit-member-accessibility': 'off',
                '@typescript-eslint/no-object-literal-type-assertion': 'off',
                '@typescript-eslint/explicit-function-return-type': 'off',
                '@typescript-eslint/interface-name-prefix': 'off',
                '@typescript-eslint/no-non-null-assertion': 'off',
                '@typescript-eslint/no-misused-new': 'off',
                '@typescript-eslint/no-explicit-any': 'off',
                '@typescript-eslint/array-type': 'off',
                '@typescript-eslint/no-empty-function': 'off',
                '@typescript-eslint/no-unused-vars': 'off',
                'prefer-rest-params': 'off',
                'prettier/prettier': [
                    'error',
                    {
                        singleQuote: true,
                        arrowParens: 'always',
                        tabWidth: 4,
                        trailingComma: 'all',
                    },
                ],
            },
        },
        {
            files: ['*.graphql'],
            parser: '@graphql-eslint/eslint-plugin',
            plugins: ['@graphql-eslint'],
            rules: {
                '@graphql-eslint/known-type-names': 'error',
            },
            parserOptions: {
                schema: path.resolve(path.join(__dirname, '../../contracts/lib/cog/services/schema/*.graphqls')),
            },
        },
    ],
};
