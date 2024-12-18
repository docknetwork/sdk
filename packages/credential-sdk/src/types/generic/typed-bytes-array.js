import TypedBytes from "./typed-bytes";

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
