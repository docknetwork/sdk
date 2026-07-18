import {
  ensureBytes,
  normalizeToU8a,
  randomAsU8a,
  u8aToHex,
  u8aToU8a,
} from '../../utils/types/bytes';
import { ArrayWithoutPrototypeMethods } from '../../utils';
import withBase from './with-base';
import withCatchNull from './with-catch-null';
import withEq from './with-eq';

class TypedBytes extends withBase(ArrayWithoutPrototypeMethods) {
  /**
   * Creates an instance of TypedBytes from provided bytes.
   * @param {Uint8Array|Array<number>|string} bytes - Bytes in various formats
   * @throws Will throw if bytes are invalid
   */
  constructor(bytes) {
    super();

    this.set(normalizeToU8a(bytes));
  }

  /**
   * Hex string representation of the bytes
   * @type {string}
   */
  get value() {
    return this.toHex();
  }

  /**
   * The raw Uint8Array representation of the bytes
   * @type {Uint8Array}
   */
  get bytes() {
    return u8aToU8a(Array.prototype.values.call(this));
  }

  /**
   * Sets the byte values for this instance
   * @param {(Uint8Array|Array<number>|string)} maybeBytes - Bytes in various formats
   * @throws Will throw if invalid bytes are provided
   */
  set(maybeBytes) {
    const bytes = ensureBytes(maybeBytes);
    this.length = bytes.length;

    for (let i = 0; i < bytes.length; i++) {
      this[i] = bytes[i];
    }
  }

  /**
   * Creates a new TypedBytes instance from API data
   * @param {*} value - API data to create from
   */
  static fromApi(value) {
    return new this(value);
  }

  /**
   * Generates random bytes of specified size
   * @param {number} size - Number of bytes to generate (must be between 1-65535)
   * @returns {TypedBytes} New instance with random bytes
   * @throws Will throw if invalid size is provided
   */
  static random(size) {
    if (!Number.isInteger(size) || size < 0 || size > 65535) {
      throw new Error(
        `Expected a natural number between 1 and 65535, received: \`${size}\``,
      );
    }

    return new this(randomAsU8a(size));
  }

  /**
   * Converts bytes to hex string representation
   * @returns {string} Hex string
   */
  toHex() {
    return u8aToHex(this);
  }

  /**
   * Returns JSON representation of the bytes (hex string)
   * @returns {string} Hex string suitable for JSON
   */
  toJSON() {
    return this.toHex();
  }

  /**
   * Applies a function to the value property
   * @param {Function} fn - Function to apply
   * @returns {*} Result of applying function
   */
  apply(fn) {
    return fn(this.value);
  }

  /**
   * Creates TypedBytes instance from JSON data
   * @param {string} json - Hex string from JSON
   */
  static fromJSON(json) {
    return new this(json);
  }

  /**
   * Creates a new TypedBytes instance from various input types
   * @param {*} obj - Input to create from
   * @returns {TypedBytes} New instance
   */
  static from(obj) {
    if (obj instanceof this) {
      return obj;
    } else if (!Array.isArray(obj) && typeof obj !== 'string') {
      return this.fromApi(obj);
    } else {
      return new this(obj);
    }
  }

  /**
   * Checks equality with another TypedBytes instance
   * @param {TypedBytes|string} other - Value to compare against
   * @returns {boolean} True if equal, false otherwise
   */
  eq(other) {
    return String(this) === String(other);
  }

  /**
   * Returns string representation of the bytes (hex)
   * @returns {string} Hex string representation
   */
  toString() {
    return this.toHex();
  }

  /**
   * Returns locale-specific string representation (same as toString())
   * @returns {string} Hex string representation
   */
  toLocaleString() {
    return this.toString();
  }
}

/**
 * Class representing sequence of bytes.
 */
export default withEq(withCatchNull(TypedBytes));
