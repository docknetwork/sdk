/**
 * Before resolving an entity, ensures that `DockAPI` is initialized, throws an error otherwise.
 * @template T
 * @param {T} resolverClass
 * @returns {T}
 */
export const withInitializedDockAPI = (resolverClass) => class WithInitializedDockAPI extends resolverClass {
  async resolve(url) {
    if (this.dock.isInitialized()) {
      return super.resolve(url);
    } else {
      throw new Error('DockAPI is not connected');
    }
  }
};

/**
 * Returns string containing comma separated items of the provided iterable.
 *
 * @template V
 * @param {Iterable<V>} iter
 * @returns {string}
 */
const fmtIter = (iter) => `\`[${[...iter].map((item) => item.toString()).join(', ')}]\``;

/**
 * Ensures that each item is present in the allowed set and that both sets are valid.
 *
 * @template T
 * @param {Iterable<T>} items
 * @param {Iterable<T>} allowed
 * @param {T} wildcard
 */
export const itemsAllowed = (items, allowed, wildcard) => {
  const itemsSet = new Set(items);
  const allowedSet = new Set(allowed);
  if (items.size === 0) {
    throw new Error('Empty item set provided');
  }
  if (allowed.size === 0) {
    throw new Error('Empty allowed set provided');
  }

  for (const toCheck of [itemsSet, allowedSet]) {
    if (toCheck.has(wildcard) && toCheck.size > 1) {
      throw new Error(
        `Can't have wildcard mixed with other patterns for ${fmtIter(toCheck)}`,
      );
    }
  }

  if (allowedSet.has(wildcard)) return;

  for (const item of itemsSet) {
    if (!allowedSet.has(item)) {
      throw new Error(
        `Item not found in ${fmtIter(allowedSet)}: \`${item.toString()}\``,
      );
    }
  }
};
