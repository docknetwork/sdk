// deep copy a json serializable object
export function deepClone(obj) {
  return Object.setPrototypeOf(
    JSON.parse(JSON.stringify(obj)),
    Object.getPrototypeOf(obj),
  );
}

/**
 * Filters properties of the object according to the supplied `filter`.
 *
 * @template K
 * @template V
 * @param {Object<K, V>} obj
 * @param {function(K, V): boolean} filter
 * @returns {Object<K, V>}
 */
export const filterObj = (obj, filter) => {
  const res = Object.create(Object.getPrototypeOf(obj));
  for (const [key, value] of Object.entries(obj)) {
    if (filter(key, value)) {
      res[key] = value;
    }
  }

  return res;
};

/**
 * Maps properties of the object according to the supplied `map`.
 *
 * @template K
 * @template VI
 * @template VO
 * @param {Object<K, VI>} obj
 * @param {function(VI): VO} map
 * @returns {Object<K, VO>}
 */
export const mapObj = (obj, map) => {
  const res = Object.create(Object.getPrototypeOf(obj));
  for (const [key, value] of Object.entries(obj)) {
    res[key] = map(value);
  }

  return res;
};

/**
 * Sets prototype of the supplied object to `null`, returns the object.
 * @template T
 * @param {T}
 * @returns {T}
 */
export const extendNull = (obj) => Object.setPrototypeOf(obj, null);
