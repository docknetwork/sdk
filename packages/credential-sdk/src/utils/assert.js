export const assert = (cond, error) => {
  if (!cond) {
    throw new Error(error);
  }
};
