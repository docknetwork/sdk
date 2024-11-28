/* eslint-disable */
export const testIf =
  (filter) =>
  (...args) =>
    filter(...args) ? test(...args) : test.skip(...args);
/* eslint-enable */
