/**
   * Check if the given input is hexadecimal or not. Optionally checks for the byte size of the hex. Case-insensitive on hex chars
   * @param {string} value - Hexadecimal value
   * @param {number} byteSize - Expected byte size of the input.
   * @return {Boolean} True if hex (with given size) else false
   */
function isHexWithGivenByteSize(value, byteSize) {
  var match = value.match(/^0x([0-9a-f]+$)/i);
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

/** // TODO: Error handling when `stateChange` is not registered
 * Helper function to return bytes of a `StateChange` enum. Updates like key change, DID removal, revocation, etc
 * require the change to be wrapped in `StateChange` before serializing for signing.
 * @param {ApiPromise} api - Promise API from polkadot-js
 * @param {object} stateChange - A representation of a `StateChange` enum variant
 * @return {array} An array of Uint8
 */
function getBytesForStateChange(api, stateChange) {
  return api.createType('StateChange', stateChange).toU8a();
}

export {
  isHexWithGivenByteSize,
  getBytesForStateChange
};
