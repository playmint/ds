/** @format */

module.exports = {
    parser: '@typescript-eslint/parser',
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier/@typescript-eslint',
        'plugin:react/recommended',
        'plugin:prettier/recommended'
    ],
    plugins: ['@typescript-eslint', 'prettier'],
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true
        }
    },
    rules: {
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-object-literal-type-assertion': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/camelcase': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-empty-interface': 'off',
        '@typescript-eslint/no-inferrable-types': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars-experimental': 'warn',
        'no-async-promise-executor': 'off',
        'react/prop-types': 'off',
        'react/display-name': 'off',
        'react/react-in-jsx-scope': 'off'
    },
    settings: {
        react: {
            version: 'detect'
        }
    },
    env: {
        node: true
    },
    overrides: [
        {
            files: ['*.graphql', '*.graphqls'],
            parser: '@graphql-eslint/eslint-plugin',
            plugins: ['@graphql-eslint'],
            rules: {
                'prettier/prettier': 'error'
            }
        },
        // the following is required for `eslint-plugin-prettier@<=3.4.0` temporarily
        // after https://github.com/prettier/eslint-plugin-prettier/pull/415
        // been merged and released, it can be deleted safely
        {
            files: ['*.js/*.graphql', '*.js/*.graphqls'],
            rules: {
                'prettier/prettier': 'off'
            }
        }
    ]
};
