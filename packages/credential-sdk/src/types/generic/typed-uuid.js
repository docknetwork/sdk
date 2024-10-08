import {
  parse, validate, stringify, v4,
} from 'uuid';
import TypedString from './typed-string';

export default class TypedUUID extends TypedString {
  constructor(id) {
    super(validate(id) ? parse(id) : id);

    if (!validate(this.value)) {
      throw new Error(`Invalid UUID: ${this.value}`);
    }
  }

  get value() {
    return stringify(this.bytes);
  }

  toString() {
    return this.value;
  }

  static random() {
    return new this(v4());
  }
}
