import { applyToValue, maybeToJSONString } from "./interfaces";
import { ensureBytes, ensureString, isBytes } from "./type-helpers";

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
 * Creates random `Uint8Array` array of supplied byte length.
 * @param {number} length
 * @returns {Uint8Array}
 */
export const randomAsU8a = (length) =>
  Uint8Array.from({ length }, () => Math.floor(Math.random() * 256));

/**
 * Creates random hex string of supplied byte length.
 * @param {number} length
 * @returns {string}
 */
export const randomAsHex = (length) => u8aToHex(randomAsU8a(length));

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
 * Converts a number to bytes.
 * @param {number} num - The number to be converted.
 * @returns {Uint8Array} The number in bytes representation.
 */
export const numToBytes = (num) => {
  // Check if the input is a number
  if (typeof num !== "number") {
    throw new TypeError("Input must be a number");
  }

  // Convert the number to its byte representation using DataView and ArrayBuffer
  const buf = Buffer.alloc(4);
  buf.writeUint32BE(num);
  return u8aToU8a(buf);
};

/**
 * Attempts to get byte representation of the supplied object.
 * Throws an error in case if it's not possible.
 * @param {*} obj
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
        ? numToBytes(inner)
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
