/**
 * Check if the given input is hexadecimal or not. Optionally checks for the byte size of the hex. Case-insensitive on hex chars
 * @param {string} value - Hexadecimal value
 * @param {number} byteSize - Expected byte size of the input.
 * @return {Boolean} True if hex (with given size) else false
 */
export function isHexWithGivenByteSize(value, byteSize) {
  const match = value.match(/^0x([0-9a-f]+$)/i);
  if (match && match.length > 1) {
    if (byteSize) {
      // 2 hex digits make a byte
      return match[1].length === (2 * byteSize);
    } else {
      // Don't care about byte size of the match but it must be full byte
      return (match[1].length % 2) === 0;
    }
  } else {
    return false;
  }
}
