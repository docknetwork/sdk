/* eslint-disable */
export const testIf =
  (filter) =>
  (...args) =>
    filter(...args) ? test(...args, 6e4) : test.skip(...args);
/* eslint-enable */
