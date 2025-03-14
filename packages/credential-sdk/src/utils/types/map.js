/**
 * Return true if the given value is a Map.
 * @param value
 * @returns {boolean}
 */
export function isMap(value) {
  return value instanceof Map;
}

/**
 * Ensures that the given value is a Map. Throws an error with an optional context message if not.
 * @param {any} value - The value to check.
 * @param {string} [message] - Optional message for the error.
 * @returns {Map} - The value if it's a Map.
 */
export function ensureMap(value) {
  if (isMap(value)) {
    return value;
  }

  throw new TypeError(`\`${value}\` needs to be a Map.`);
}

/**
 * A `Map` that has a capacity.
 */
export class MapWithCapacity extends Map {
  /**
   *
   * @param {number} capacity
   */
  constructor(capacity, ...args) {
    if (capacity < 1) {
      throw new Error(`Capacity must be greater than 0, received: ${capacity}`);
    }
    super(...args);
    this.capacity = capacity;
    this.adjustSize();
  }

  /**
   * Associates supplied value with the provided key.
   * If the capacity was reached, earliest item added to this map will be removed.
   * Unlike with the standard `Map`, the latest set item will always be emitted
   * last by the iterables, even in case it was already added and then overriden.
   *
   * @param key
   * @param value
   */
  set(key, value) {
    // `Map` iterables produce items in the insertion order.
    // Thus we have to remove a possibly existing item from the map to make the new entry emitted
    // last by the iterators produced by calling `entries`/`keys`/`values` methods.
    this.delete(key);

    const res = super.set(key, value);
    this.adjustSize();

    return res;
  }

  /**
   * Adjusts the size of the underlying map, so it will fit the capacity.
   */
  adjustSize() {
    while (this.size > this.capacity) {
      this.removeFirstAdded();
    }
  }

  /**
   * Removes the earliest item added to the map.
   */
  removeFirstAdded() {
    const { value: key, done } = this.keys().next();

    return !done && this.delete(key);
  }
}
