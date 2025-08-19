import {
  validateProperties,
  withExtendedStaticProperties,
} from '../../utils/inheritance';
import { maybeEq, maybeFrom } from '../../utils/interfaces';
import withBase from './with-base';
import withCatchNull from './with-catch-null';
import withEq from './with-eq';

class TypedStruct extends withBase(class StructBase {}) {
  static Classes;

  constructor(...values) {
    super();

    let idx = 0;
    for (const key of Object.keys(this.constructor.Classes)) {
      const prop = Symbol(key);

      Object.defineProperty(this, key, {
        enumerable: true,
        get() {
          return this[prop];
        },
        set(newValue) {
          try {
            this[prop] = maybeFrom(this.constructor.Classes[key], newValue);
          } catch (error) {
            error.message = `\nFailed to set property \`${key}\` of \`${this.constructor.name}\`: ${error.message}`;

            throw error;
          }
        },
      });

      this[key] = values[idx++];
    }

    validateProperties(this);
    Object.seal(this);
  }

  apply(fn) {
    return Object.fromEntries(
      Object.entries(this).map(([key, value]) => [key, fn(value)]),
    );
  }

  static fromJSON(obj) {
    return new this(...Object.keys(this.Classes).map((key) => obj[key]));
  }

  static fromApi(obj) {
    return this.fromJSON(obj);
  }

  eq(other) {
    const thisEntries = Object.entries(this);
    const otherEntries = Object.entries(other);

    if (thisEntries.length !== otherEntries.length) {
      return false;
    }

    for (const key of Object.keys(this)) {
      if (!maybeEq(this[key], other[key])) {
        return false;
      }
    }

    return true;
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }

  toJSON() {
    const result = {};
    for (const key of Object.keys(this)) {
      const value = this[key];
      result[key] = value && typeof value.toJSON === 'function' ? value.toJSON() : value;
    }
    return result;
  }
}

export default withEq(
  withCatchNull(withExtendedStaticProperties(['Classes'], TypedStruct)),
);
