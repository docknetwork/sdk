import TypedBytes from "./typed-bytes";
import TypedArray from "./typed-array";

export class ByteArray extends TypedBytes {
  toJSON() {
    return this.bytes;
  }
}

export class ArrayOfByteArrays extends TypedArray {
  static Class = TypedBytes;
}
