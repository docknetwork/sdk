module.exports = {
  "plugins": ["jest"],
  "globals": {
    "process": "readonly"
  },
  "env": {
    "browser": true,
    "es6": true
  },
  "extends": ["eslint:recommended", "plugin:jest/recommended", "airbnb-base"],
  "parserOptions": {
    "ecmaVersion": 2018,
    "sourceType": "module"
  }
};
