module.exports = {
  "plugins": ["jest"],
  "globals": {
    "process": "readonly"
  },
  "env": {
    "browser": true,
    "es6": true
  },
  "extends": ["eslint:recommended", "plugin:jest/recommended"],
  "parserOptions": {
    "ecmaVersion": 2018,
    "sourceType": "module"
  },
  "rules": {
    "space-before-function-paren": ["error", {
      "anonymous": "never",
      "named": "never",
      "asyncArrow": "always"
    }],
    "indent": [
      "error",
      2
    ],
    "linebreak-style": [
      "error",
      "unix"
    ],
    "quotes": [
      "error",
      "single"
    ],
    "semi": [
      "error",
      "always"
    ]
  }
};
