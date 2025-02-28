import { ensureInstanceOf } from './inheritance';
import { maybeToJSONString } from './interfaces';
import {
  ensureIterable,
  ensureMap,
  ensureObject,
  fmtIterable,
  toIterator,
} from './types';

/**
 * Pattern matching error.
 *
 * @param message
 * @param path
 * @param pattern
 * @param errors
 */
export class PatternError extends Error {
  constructor(message, path, pattern, errors = []) {
    super(message);

    this.message = message;
    this.path = path;
    this.pattern = pattern;
    this.errors = errors;
  }
}

/**
 * Entity used to ensure that provided value matches supplied pattern(s), throws error(s) otherwise.
 */
export class PatternMatcher {
  /**
   * Ensures that provided value matches supplied pattern(s), throws an error otherwise.
   *
   * @param pattern
   * @param value
   * @param {?Array} path
   */
  check(pattern, value, path = []) {
    for (const key of Object.keys(pattern)) {
      if (!key.startsWith('$') || this[key] == null) {
        throw new PatternError(`Invalid pattern key \`${key}\``, path, pattern);
      }

      try {
        this[key](pattern, value, path);
      } catch (error) {
        if (error instanceof PatternError) {
          throw error;
        } else {
          const message = path.length > 0
            ? `${error.message}, path: \`${path.join('.')}\``
            : error.message;

          throw new PatternError(message, path, pattern, error.errors);
        }
      }
    }
  }

  /**
   * Supplied value matches pattern's type.
   *
   * @param pattern
   * @param value
   */
  $matchType(pattern, value) {
    // eslint-disable-next-line valid-typeof
    if (typeof value !== pattern.$matchType) {
      throw new Error(
        `Invalid value provided, expected value with type \`${
          pattern.$matchType
        }\`, received value with type \`${typeof value}\``,
      );
    }
  }

  /**
   * Supplied value matches pattern's value.
   *
   * @param pattern
   * @param value
   */
  $matchValue(pattern, value) {
    if (!Object.is(value, pattern.$matchValue)) {
      throw new Error(
        `Unknown value \`${value}\`, expected ${pattern.$matchValue}`,
      );
    }
  }

  /**
   * Supplied value is an object that matches pattern's object patterns.
   *
   * @param pattern
   * @param value
   * @param path
   */
  $matchObject(pattern, value, path) {
    for (const key of Object.keys(ensureObject(value))) {
      if (!Object.hasOwnProperty.call(pattern.$matchObject, key)) {
        throw new Error(
          `Invalid property \`${key}\`, expected keys: ${fmtIterable(
            Object.keys(pattern.$matchObject),
          )}`,
        );
      }

      this.check(pattern.$matchObject[key], value[key], path.concat(key));
    }
  }

  /**
   * Supplied value is an iterable that matches the pattern's iterable's patterns.
   *
   * @param pattern
   * @param value
   * @param path
   */
  $matchIterable(pattern, value, path) {
    const objectIter = toIterator(value);

    let idx = 0;
    for (const pat of pattern.$matchIterable) {
      const { value: item, done } = objectIter.next();
      if (done) {
        throw new Error(
          `Value iterable is shorter than expected, received: ${fmtIterable(
            value,
          )}`,
        );
      }

      this.check(pat, item, path.concat(idx++));
    }
  }

  /**
   * Supplied value is an instance of the pattern's specified constructor.
   *
   * @param pattern
   * @param value
   */
  $instanceOf(pattern, value) {
    ensureInstanceOf(value, pattern.$instanceOf);
  }

  /**
   * Supplied value is an iterable each item of which matches `pattern`'s pattern.
   *
   * @param pattern
   * @param value
   * @param path
   */
  $iterableOf(pattern, value, path) {
    let idx = 0;
    for (const entry of ensureIterable(value)) {
      this.check(pattern.$iterableOf, entry, path.concat(idx++));
    }
  }

  /**
   * Supplied value is a map in which keys and values match `pattern`'s patterns.
   *
   * @param pattern
   * @param value
   * @param path
   */
  $mapOf(pattern, value, path) {
    if (!Array.isArray(pattern.$mapOf) || pattern.$mapOf.length !== 2) {
      throw new Error(
        `\`$mapOf\` pattern should be an array with two items, received \`${maybeToJSONString(
          pattern,
        )}\``,
      );
    }

    for (const [key, item] of ensureMap(value).entries()) {
      this.check(pattern.$mapOf[0], key, path.concat(`${key}#key`));
      this.check(pattern.$mapOf[1], item, path.concat(key));
    }
  }

  /**
   * Supplied value matches at least one of `pattern`'s patterns.
   *
   * @param pattern
   * @param value
   * @param path
   */
  $anyOf(pattern, value, path) {
    let anySucceeded = false;
    const errors = [];

    for (const pat of pattern.$anyOf) {
      if (anySucceeded) {
        break;
      } else {
        try {
          this.check(pat, value, path);
          anySucceeded = true;
        } catch (err) {
          errors.push(err);
        }
      }
    }

    if (!anySucceeded) {
      const error = new Error(`Neither of patterns succeeded for \`${value}\``);
      error.errors = errors;

      throw error;
    }
  }

  /**
   * Supplied value is an object with one key existing in `pattern` that matches the pattern under this key.
   *
   * @param pattern
   * @param value
   * @param path
   */
  $objOf(pattern, value, path) {
    const keys = Object.keys(ensureObject(value));
    if (keys.length !== 1) {
      throw new Error('Expected a single key');
    }
    const [key] = keys;

    if (!Object.hasOwnProperty.call(pattern.$objOf, key)) {
      throw new Error(
        `Invalid value key provided, expected one of \`${fmtIterable(
          Object.keys(pattern.$objOf),
        )}\`, received \`${key}\``,
      );
    }

    this.check(pattern.$objOf[key], value[key], path.concat(key));
  }

  /**
   * Ensures that supplied value satisfies provided function.
   *
   * @param pattern
   * @param value
   * @param path
   */
  $ensure(pattern, value) {
    pattern.$ensure(value);
  }
}

/**
 * Ensures that provided value matches supplied pattern(s), throws an error otherwise.
 *
 * @param pattern
 * @param value
 */
export const ensureMatchesPattern = (pattern, value) => new PatternMatcher().check(pattern, value);
