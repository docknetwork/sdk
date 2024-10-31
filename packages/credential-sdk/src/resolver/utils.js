import { fmtIter } from '../utils/generic';

/**
 * Caches last function result and returns it if function called with the same args again.
 * @param {Function}
 * @returns {Function}
 */
export const cacheLast = (fn) => {
  let lastArgs;
  let lastValue;

  return function cached(...args) {
    if (lastArgs !== void 0) {
      let same = true;
      const length = Math.max(lastArgs.length, args.length);
      for (let i = 0; i < length && same; ++i) {
        same &&= lastArgs[i] === args[i];
      }

      if (same) {
        return lastValue;
      }
    }
    lastValue = fn.apply(this, args);
    lastArgs = args;

    return lastValue;
  };
};

/**
 * Ensures that each item is present in the allowed set and that both sets are valid.
 *
 * @template I
 * @template W
 * @param {Iterable<I | W>} items
 * @param {Iterable<T | W>} allowed
 * @param {W} wildcard
 */
export const ensureItemsAllowed = (items, allowed, wildcard) => {
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

export const itemsOrWildcard = (items, wildcard) => {
  for (const item of items) {
    if (item === wildcard) {
      return wildcard;
    }
  }

  return [...new Set(items)];
};
