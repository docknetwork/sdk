import crypto from "crypto";
import { applyToValue } from "./interfaces";
import { ensureString, ensureIterable } from "./types/ensure-type";
import { isIterable } from "./types";

/**
 * Checks that the given value is a byte (an integer between 0 and 255).
 *
 * @param {*} byte - The value to check.
 * @returns {boolean} - The validated byte value.
 */
export const isByte = (num) => Number.isInteger(num) && num >= 0 && num <= 255;

/**
 * Ensures that the given value is a byte (an integer between 0 and 255).
 *
 * @param {*} byte - The value to check.
 * @throws If value is not a byte.
 * @returns {number} - The validated byte value.
 */
export function ensureByte(num) {
  if (isByte(num)) {
    return num;
  }

  throw new Error(`Expected \`${num}\` to be an integer in range 0-255`);
}

/**
 * Ensures that the given value is a list of bytes. If it's not a Uint8Array, converts it to one by mapping each element through `ensureByte`.
 *
 * @param {Uint8Array|Iterable<number>} bytes - The bytes to validate.
 * @throws If value is not a bytes.
 * @returns {Uint8Array} - The validated Uint8Array containing the bytes.
 */
export const ensureBytes = (bytes) => {
  if (bytes instanceof Uint8Array) {
    return bytes;
  }

  return Uint8Array.from([...ensureIterable(bytes)].map(ensureByte));
};

/**
 * Checks that the given value is a list of bytes. If it's not a Uint8Array, validates each item using `ensureByte`.
 *
 * @param {Uint8Array|Iterable<number>} bytes - The bytes to validate.
 * @throws If value is not a bytes.
 * @returns {boolean} - The validated Uint8Array containing the bytes.
 */
export const isBytes = (bytes) => {
  if (bytes instanceof Uint8Array) {
    return true;
  } else if (isIterable(bytes)) {
    for (const byte of bytes) {
      if (!isByte(byte)) {
        return false;
      }
    }

    return true;
  } else {
    return false;
  }
};

/**
 * Check if the given input is hexadecimal or not. Optionally checks for the byte size of the hex. Case-insensitive on hex chars
 * @param {string} value - Hexadecimal value
 * @param {number} [byteSize] - Expected byte size of the input.
 * @return {boolean} True if hex (with given size) else false
 */
export const isHexWithGivenByteSize = (value, byteSize) => {
  if (typeof value !== "string") {
    return false;
  }
  const match = value.match(/^0x([0-9a-f]+$)/i);

  if (match && match.length > 1) {
    if (byteSize !== undefined) {
      // If `byteSize` is not a positive integer type, then check will fail
      // 2 hex digits make a byte
      return match[1].length === 2 * byteSize;
    }
    // Don't care about byte size of the match but it must be full byte
    return match[1].length % 2 === 0;
  }

  return false;
};

/**
 * Returns `true` if provided value is a valid hex string.
 * @param value
 * @returns {boolean}
 */
export const isHex = (value) => isHexWithGivenByteSize(value);

/**
 * Converts supplied bytes to its hex representation.
 * @param {Iterable<number>} bytes
 * @returns {string}
 */
export const u8aToHex = (bytes) =>
  `0x${Buffer.from(ensureBytes(bytes)).toString("hex")}`;

/**
 * Creates `Uint8Array` from the supplied hex string.
 * @param {string} str
 * @returns {Uint8Array}
 */
export const hexToU8a = (str) => {
  if (!isHex(str)) {
    throw new Error(
      `Expected valid hex string, received: \`${str}\` with type \`${typeof str}\``
    );
  }

  return Uint8Array.from(Buffer.from(str.slice(2), "hex"));
};

/**
 * Creates `Buffer` from the supplied string.
 * @param {string} str
 * @returns {Buffer}
 */
export const stringToBuffer = (str) => Buffer.from(ensureString(str));

/**
 * Creates `Uint8Array` from the supplied string.
 * @param {string} str
 * @returns {Uint8Array}
 */
export const stringToU8a = (str) => Uint8Array.from(stringToBuffer(str));

/**
 * Creates `Uint8Array` from the supplied buffer.
 * @param {Buffer} buffer
 * @returns {Uint8Array}
 */
export const bufferToU8a = (buffer) => {
  if (!(buffer instanceof Buffer)) {
    throw new Error(`Expected instance of \`Buffer\`, received: \`${buffer}\``);
  }

  return Uint8Array.from(buffer);
};

/**
 * Converts supplied bytes to `Uint8Array` representation.
 * @param {Iterable<number>} bytes
 * @returns {Uint8Array}
 */
export const u8aToU8a = (bytes) => bufferToU8a(Buffer.from(ensureBytes(bytes)));

/**
 * Converts supplied bytes buffer to its hex string representation.
 * @param {Iterable<number>} bytes
 * @returns {string}
 */
export const u8aToString = (bytes) =>
  Buffer.from(ensureBytes(bytes)).toString();

/**
 * Converts supplied string containing any characters to its hex string representation.
 * @param {string} str
 * @returns {string}
 */
export const stringToHex = (str) => u8aToHex(stringToBuffer(str));

/**
 * Attempts to convert supplied bytes to `Uint8Array`.
 * @param {string | Uint8Array | Array<number>} bytes
 * @returns {Uint8Array}
 */
export const normalizeToU8a = (bytes) => {
  if (bytes instanceof Uint8Array) {
    return bytes;
  } else if (isBytes(bytes)) {
    return u8aToU8a(bytes);
  } else if (isHex(bytes)) {
    return hexToU8a(bytes);
  }

  throw new Error(
    `Can't convert supplied value to \`Uint8Array\`: \`${bytes}\` ${
      bytes ? `instance of \`${bytes.constructor.name}\`` : ""
    }`
  );
};

/**
 * Attempts to convert supplied bytes or a raw string to `Uint8Array`.
 * @param {Uint8Array | string} bytesOrString
 * @returns {Uint8Array}
 */
export const normalizeOrConvertStringToU8a = (bytesOrString) =>
  typeof bytesOrString === "string" && !isHex(bytesOrString)
    ? stringToU8a(bytesOrString)
    : normalizeToU8a(bytesOrString);

/**
 * Creates random `Uint8Array` array of supplied byte length.
 * @param {number} length
 * @returns {Uint8Array}
 */
export const randomAsU8a = (length) => u8aToU8a(crypto.randomBytes(length));

/**
 * Creates random hex string of supplied byte length.
 * @param {number} length
 * @returns {string}
 */
export const randomAsHex = (length) => u8aToHex(randomAsU8a(length));

/**
 * Attempts to get byte representation of the supplied object.
 * Throws an error in case if it's not possible.
 * @param {*} obj
 * @returns {Uint8Array}
 */
export const valueBytes = (value) =>
  applyToValue(
    (inner) =>
      Array.isArray(inner) ||
      inner instanceof Uint8Array ||
      (inner && typeof inner === "object" && "bytes" in inner),
    (inner) => normalizeToU8a(inner.bytes ?? inner),
    value
  );

/**
 * Attempts to get byte representation of the supplied object.
 * Throws an error in case if it's not possible.
 * @param {*} value
 * @returns {Uint8Array}
 */
export const valueNumberOrBytes = (value) =>
  applyToValue(
    (inner) =>
      Array.isArray(inner) ||
      inner instanceof Uint8Array ||
      (inner && typeof inner === "object" && "bytes" in inner) ||
      typeof inner === "number",
    (inner) =>
      typeof inner === "number"
        ? stringToU8a(String(inner))
        : normalizeToU8a(inner.bytes ?? inner),
    value
  );

/**
 * Normalizes the given input to hex. Expects a Uint8Array or a hex string
 * @param {Uint8Array|string} data
 * @returns {string}
 */
export function normalizeToHex(data) {
  if (
    data instanceof Uint8Array ||
    data instanceof Buffer ||
    Array.isArray(data)
  ) {
    return u8aToHex(data);
  } else if (isHex(data)) {
    return data;
  }

  throw new Error(
    `Expected a hex string or a byte array, received \`${data}\` with type \`${typeof data}\``
  );
}
