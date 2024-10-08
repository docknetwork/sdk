import { TestEnvironment as NodeEnvironment } from "jest-environment-node";

class TestEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(
      {
        ...config,
        globals: {
          ...config.globals,
          Uint32Array,
          Uint8Array,
          ArrayBuffer,
          TextDecoder,
          TextEncoder,
          Buffer,
        },
      },
      context
    );
  }

  async setup() {}

  async teardown() {}
}

export default TestEnvironment;
