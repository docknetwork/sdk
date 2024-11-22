/**
 * Attempts to call `value.toJSON()`, returns `JSON.parse(JSON.stringify(value))` if method doesn't exist.
 * @template T
 * @param {T} value
 * @returns {object}
 */
export const maybeToJSON = (value) => (value && typeof value.toJSON === 'function' ? value.toJSON() : JSON.parse(JSON.stringify(value)));

/**
 * Attempts to call `value.toJSON()` and stringify the result, returns `String(value)` in case of failure.
 * @template T
 * @param {T} value
 * @returns {string}
 */
export const maybeToJSONString = (value) => {
  const json = maybeToJSON(value);

  try {
    return JSON.stringify(json);
  } catch {
    return String(json);
  }
};

/**
 * Attempts to compare two values using `value.eq(other)`, returns `boolean`.
 * @template T
 * @param {T} value
 * @param {T} other
 * @returns {boolean}
 */
export const maybeEq = (value, other) => (value && typeof value.eq === 'function' ? value.eq(other) : value === other);

/**
 * Attempts to call `value.toHuman()` or `value.toJSON`, returns `value` if methods don't exist.
 * @template T
 * @param {T} value
 * @returns {object}
 */
export const maybeToHuman = (obj) => (obj && typeof obj.toHuman === 'function' ? obj.toHuman() : maybeToJSON(obj));

/**
 * Attempts to call `value.toNumber()`, returns `+value` if method doesn't exist.
 * @template T
 * @param {T} value
 * @returns {number}
 */
export const maybeToNumber = (value) => (value && typeof value.toNumber === 'function' ? value.toNumber() : +value);

/**
 * Marks function that it can't be used as a constructor.
 */
export const NotAConstructor = Symbol.for(
  '@docknetwork/credential-sdk/NotAConstructor',
);

/**
 * Attempts to intantiate new object of the supplied class using provided arguments.
 * @param Class
 * @param args
 */
export const maybeNew = (Class, args) => (!Class[NotAConstructor] ? new Class(...args) : Class.apply(Class, args));

/**
 * Attempts to create new instance of the supplied class using `Class.from(obj)`, instantiates class if `from` doesn't exist.
 * @param Class
 * @param args
 */
export const maybeFrom = (klass, obj) => (typeof klass.from === 'function' ? klass.from(obj) : maybeNew(klass, [obj]));

/**
 * Applies function to the inner value of the provided object.
 * @template T
 * @template I
 * @template O
 * @param {function(I): boolean} check
 * @param {function(I): O} fn
 * @param {T} value
 * @returns {O}
 */
export const applyToValue = (check, fn, value, rec = true) => {
  if (check(value)) {
    return fn(value);
  } else if (rec && typeof value?.applyToValue === 'function') {
    return value.applyToValue(check, fn);
  }

  throw new Error(
    `\`fn\` can't be applied because value \`${value}\` didn't pass the check \`${check}\``,
  );
};
