/**
   * Check if the given input is hexadecimal or not. Optionally checks for the byte size of the hex. Case-insensitive on hex chars
   * @param {number/string} value - Hexadecimal value
   * @param {number} byteSize - Expected byte size of the input.
   * @return {bool} True if hex (with given size) else false
   */
function isHexWithGivenByteSize(value, byteSize) {
  var match = value.match(/^0x([0-9a-f]+$)/i);
  if (match && match.length > 1) {
    if (byteSize == 0) {
      // 2 hex digits make a byte
      return match[1].length == (2 * byteSize);
    } else {
      // Don't care about byte size of the match
      return true;
    }
  } else {
    return false;
  }
}

export {
  isHexWithGivenByteSize
};
