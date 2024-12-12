import TypedBytes from './typed-bytes';
import TypedArray from './typed-array';

export class ByteArray extends TypedBytes {}

export class ArrayOfByteArrays extends TypedArray {
  static Class = TypedBytes;
}
