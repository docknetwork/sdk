/**
 * Attempts to call `value.toJSON()`, returns `JSON.parse(JSON.stringify(value))` if method doesn't exist.
 * @template T
 * @param {T} value
 * @returns {object}
 */
export const maybeToJSON = (value) =>
  typeof value?.toJSON === "function"
    ? value.toJSON()
    : JSON.parse(JSON.stringify(value));

/**
 * Stringifies the provided value converted to JSON.
 * @template T
 * @param {T} value
 * @returns {string}
 */
export const maybeToJSONString = (value) => JSON.stringify(maybeToJSON(value));

/**
 * Attempts to convert provided value to the Cheqd Payload or JSON.
 * @param {*} value
 * @returns {object}
 */
export const maybeToCheqdPayloadOrJSON = (obj) =>
  typeof obj?.toCheqdPayload === "function" // eslint-disable-line no-nested-ternary
    ? obj.toCheqdPayload()
    : typeof obj?.apply === "function" // eslint-disable-line no-nested-ternary
    ? obj.apply(maybeToCheqdPayloadOrJSON)
    : typeof value !== "object" && typeof value !== "function"
    ? obj
    : maybeToJSON(obj);

/**
 * Returns bytes of the value converted to a stringified JSON.
 * @template T
 * @param {T} value
 * @returns {string}
 */
export const maybeToJSONStringBytes = (value) =>
  typeof value?.maybeToJSONStringBytes === "function"
    ? value.toJSONStringBytes()
    : Uint8Array.from(Buffer.from(maybeToJSONString(value)));

/**
 * Attempts to compare two values using `value.eq(other)`, returns `boolean`.
 * @template T
 * @param {T} value
 * @param {T} other
 * @returns {boolean}
 */
export const maybeEq = (value, other) =>
  typeof value?.eq === "function" ? value.eq(other) : value === other;

/**
 * Attempts to call `value.toHuman()` or `value.toJSON`, returns `value` if methods don't exist.
 * @template T
 * @param {T} value
 * @returns {object}
 */
export const maybeToHuman = (obj) =>
  obj && typeof obj.toHuman === "function" ? obj.toHuman() : maybeToJSON(obj);

/**
 * Attempts to call `value.toNumber()`, returns `+value` if method doesn't exist.
 * @template T
 * @param {T} value
 * @returns {number}
 */
export const maybeToNumber = (value) =>
  typeof value?.toNumber === "function" ? value.toNumber() : +value;

/**
 * Marks function that it can't be used as a constructor.
 */
export const NotAConstructor = Symbol.for(
  "@docknetwork/credential-sdk/NotAConstructor"
);

/**
 * Attempts to intantiate new object of the supplied class using provided arguments.
 * @param Class
 * @param args
 */
export const maybeNew = (Class, args) =>
  !Class[NotAConstructor] ? new Class(...args) : Class.apply(Class, args);

/**
 * Attempts to create new instance of the supplied class using `Class.from(obj)`, instantiates class if `from` doesn't exist.
 * @param Class
 * @param args
 */
export const maybeFrom = (klass, obj) =>
  typeof klass.from === "function" ? klass.from(obj) : maybeNew(klass, [obj]);

/**
 * Error thrown when the provided function was executed more than once or wasn't executed at all.
 */
export class MustBeExecutedOnce extends Error {
  constructor(fn) {
    super(`Function must be executed exactly once: \`${fn}\``);
  }

  static ensure(fn, call) {
    let executed = false;
    const willExecute = () => {
      if (executed) {
        throw new this(fn);
      }

      executed = true;
    };
    const wasExecuted = () => {
      if (!executed) {
        throw new this(fn);
      }
    };

    const name = `mustBeExecutedOnce(${fn.name})`;
    const obj = {
      [name](...args) {
        let res;

        willExecute();
        try {
          res = fn.apply(this, args);
        } finally {
          wasExecuted();
        }

        return res;
      },
    };

    return call(obj[name]);
  }
}

/**
 * Applies function to the first value of the provided object that passes the check.
 * @template T
 * @template I
 * @template O
 * @param {function(I): boolean} check
 * @param {function(I): O} fn
 * @param {T} value
 * @returns {O}
 */
export const applyToValue = (check, fn, value) => {
  if (check(value)) {
    return fn(value);
  } else if (typeof value?.apply === "function") {
    let res;
    MustBeExecutedOnce.ensure(
      (obj) => {
        res = applyToValue(check, fn, obj);
      },
      (wrapped) => value.apply(wrapped)
    );
    return res;
  }

  throw new Error(
    `\`fn\` can't be applied because value \`${value}\` didn't pass the check \`${check}\``
  );
};
