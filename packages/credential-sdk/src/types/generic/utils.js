import TypedArray from './typed-array';
import TypedBytesArray from './typed-bytes-array';

export class TypedArrayOfBytesArrays extends TypedArray {
  static Class = TypedBytesArray;
}

/**
 * Creates a converter function that processes an item through multiple parsers.
 *
 * @param {Function} finalize - Function to apply to each processed item
 * @param {Class} parserClass - Primary parser class used to parse the initial item
 * @param {...Function} parsers - Additional parser functions to apply
 * @returns {Function} A function that takes an item and returns processed results
 */
export const createConverter = (finalize, parserClass, ...parsers) => (item) => {
  // Initialize result array with original item
  const res = [item];

  try {
    // First parse the item using primary parser
    const parsedDid = parserClass.from(item);

    // Then pass the parsed result through additional parsers
    for (const parser of parsers) {
      try {
        res.push(parser.from(parsedDid));
      } catch {
        // Error is intentionally ignored
      }
    }
  } catch {
    // Initial parsing error is intentionally ignored
  }

  // Apply finalization to all processed results
  return res.map(finalize);
};
