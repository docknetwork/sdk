import TypedBytes from './typed-bytes';

/**
 * Same as `TypedBytes` but will be converted to `Array` during JSON serialization instead of hex.
 */
export default class TypedBytesArray extends TypedBytes {
  get value() {
    return this.bytes;
  }

  toJSON() {
    return Array.from(this);
  }

  toCheqdPayload() {
    return this.value;
  }
}
