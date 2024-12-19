import { maybeToNumber } from '../../utils/interfaces';
import withBase from './with-base';
import withCatchNull from './with-catch-null';
import withEq from './with-eq';

class TypedNumber extends withBase(class NumberBase {}) {
  constructor(value) {
    super();

    const num = Number(value);
    if (!Number.isFinite(num)) {
      throw new Error(
        `Invalid number provided: \`${value}\`, parsed as \`${num}\` by \`${this.constructor.name}\``,
      );
    } else if (!Number.isSafeInteger(num)) {
      throw new Error(
        `Number must be a safe integer, received: \`${num}\` by \`${this.constructor.name}\``,
      );
    }

    this.value = num;
  }

  inc() {
    return new this.constructor(++this.value);
  }

  dec() {
    return new this.constructor(--this.value);
  }

  toJSON() {
    return this.value;
  }

  apply(fn) {
    return fn(this.value);
  }

  static from(value) {
    if (value instanceof this) {
      return value;
    } else if (typeof value === 'object') {
      return this.fromApi(value);
    } else {
      return new this(value);
    }
  }

  static fromJSON(value) {
    return new this(value);
  }

  static fromApi(value) {
    return new this(maybeToNumber(value.value ?? value));
  }

  valueOf() {
    return this.value;
  }

  eq(other) {
    return this.value === other.value;
  }
}

export default withEq(withCatchNull(TypedNumber));
