module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: ['prettier', 'standard'],
  plugins: ['prettier'],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    'prettier/prettier': 'error',
    semi: 'always'
  }
};
