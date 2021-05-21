const v22Types = require('./v22');
const v23Types = require('./v23');

const bundle = {
  spec: {
    'dock-main-runtime': {
      types: [
        {
          minmax: [0, 23],
          types: v22Types,
        },
        {
          minmax: [23],
          types: v23Types,
        },
      ],
    },
    'dock-test-runtime': {
      types: [
        {
          minmax: [0, 23],
          types: v22Types,
        },
        {
          minmax: [23],
          types: v23Types,
        },
      ],
    },
  },
};

module.exports = bundle;
