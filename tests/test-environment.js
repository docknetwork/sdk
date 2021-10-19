const NodeEnvironment = require('jest-environment-node');

class MyEnvironment extends NodeEnvironment {
  constructor(config) {
    super(
      {
        ...config,
        globals: {
          ...config.globals,
          Uint32Array,
          Uint8Array,
          ArrayBuffer,
        },
      },
    );
  }

  async setup() {}

  async teardown() {}
}

module.exports = MyEnvironment;
