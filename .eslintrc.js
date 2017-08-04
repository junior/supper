module.exports = {
    "env": {
        "es6": true,
        "node": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "sourceType": "module"
    },
    "rules": {
        //# ECMAScript 6
        //# http://eslint.org/docs/rules/#ecmascript-6
        'no-var': 'error',
        'prefer-const': 'error',
        //# #
        'valid-jsdoc': [2, {
          requireParamDescription: false,
          requireReturnDescription: false,
          requireReturn: false,
          prefer: {returns: 'return'},
        }],
        'guard-for-in': 2,
        'no-caller': 2,
        'no-console': [2, {allow: ['log']}],
        'no-extend-native': 2,
        'no-extra-bind': 2,
        'no-invalid-this': 2,
        'no-multi-spaces': 2,
        'no-multi-str': 2,
        'no-new-wrappers': 2,
        'no-with': 2,
        'no-unused-vars': [2, {args: 'none'}],
        'array-bracket-spacing': [2, 'never'],
        'brace-style': 2,
        'camelcase': [2, {properties: 'never'}],
        'comma-dangle': [2, 'only-multiline'],
        'comma-spacing': 2,
        'comma-style': 2,
        'computed-property-spacing': 2,
        'eol-last': 2,
        'func-call-spacing': 2,
        'indent': [2,4],
        'key-spacing': 2,
        'keyword-spacing': [2, {
          before: true,
          after: true,
          overrides: {
            return: { after: true },
            throw: { after: true },
            case: { after: true }
          }
        }],
        'linebreak-style': 2,
        'max-len': [2, {
          code: 80,
          tabWidth: 2,
          ignoreUrls: true,
          ignorePattern: '^\\s*var\\s.+=\\s*require\\s*\\(/',
        }],
        'new-cap': 2,
        'no-array-constructor': 2,
        'no-multiple-empty-lines': [2, {max: 2}],
        'no-new-object': 2,
        'no-plusplus': [2, { "allowForLoopAfterthoughts": true }],
        'no-trailing-spaces': 2,
        'object-curly-spacing': 2,
        'padded-blocks': [2, 'never'],
        'quote-props': [2, 'consistent'],
        'quotes': [2, 'single', {allowTemplateLiterals: true}],
        'require-jsdoc': [2, {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
          },
        }],
        'semi-spacing': 2,
        'semi': 2,
        'space-before-blocks': 2,
        'space-before-function-paren': [2, {
          anonymous: 'always',
          named: 'never',
          asyncArrow: 'always'
        }],
        'space-in-parens': [2, 'never'],
        'space-infix-ops': 2,
        'space-unary-ops': [2, {
          words: true,
          nonwords: false,
          overrides: {
          },
        }],
        'spaced-comment': [2, 'always']
    }
};