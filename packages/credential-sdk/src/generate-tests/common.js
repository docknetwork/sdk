/* eslint-disable */
export const itIf =
  (filter) =>
  (...args) =>
    filter(...args) ? it(...args) : it.skip(...args);
/* eslint-enable */
