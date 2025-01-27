import TypedBytes from './typed-bytes';
import TypedArray from './typed-array';

export class ByteArray extends TypedBytes {}

export class ArrayOfByteArrays extends TypedArray {
  static Class = TypedBytes;
}

export const createConverter = (finalize, parserClass, ...parsers) => (item) => {
  const res = [item];
  try {
    const parsedDid = parserClass.from(item);

    for (const parser of parsers) {
      try {
        res.push(parser.from(parsedDid));
      } catch {
        // Error is intentionally ignored
      }
    }
  } catch {
    // Error is intentionally ignored
  }

  return res.map(finalize);
};
