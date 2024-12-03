import TypedBytes from './typed-bytes';

export default class TypedBytesArray extends TypedBytes {
  get value() {
    return this.bytes;
  }

  toJSON() {
    return this.value;
  }
}
