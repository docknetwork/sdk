import { withExtendedStaticProperties } from '../../utils/inheritance';
import { maybeEq, maybeFrom } from '../../utils/interfaces';
import { ArrayWithoutPrototypeMethods, ensureArrayLike } from '../../utils';
import withBase from './with-base';
import withCatchNull from './with-catch-null';
import withEq from './with-eq';

class TypedTuple extends withBase(ArrayWithoutPrototypeMethods) {
  /**
   * Item's classes.
   * @type {Array<Function>}
   */
  static Classes;

  static get Size() {
    return this.Classes.length;
  }

  constructor(...items) {
    super(items.length);

    const { Size } = this.constructor;

    if (this.constructor.Size !== items.length) {
      throw new Error(
        `Received \`${items.length}\` items while expected \`${Size}\` by \`${this.constructor.name}\``,
      );
    }

    for (let idx = 0; idx < items.length; idx++) {
      const prop = Symbol(idx);

      Object.defineProperty(this, idx, {
        enumerable: true,
        get() {
          return this[prop];
        },
        set(newValue) {
          try {
            this[prop] = maybeFrom(this.constructor.Classes[idx], newValue);
          } catch (error) {
            error.message = `\nFailed to set property \`${idx}\` of \`${this.constructor.name}\`: ${error.message}`;

            throw error;
          }
        },
      });

      this[idx] = items[idx];
    }

    Object.seal(this);
  }

  apply(fn) {
    return [...this].map(fn);
  }

  static from(value) {
    if (value instanceof this) {
      return value;
    } else if (Array.isArray(value)) {
      return this.fromJSON(value);
    } else if (typeof value === 'object') {
      return this.fromApi(value);
    } else {
      return new this(value);
    }
  }

  static fromJSON(arr) {
    return new this(...ensureArrayLike(arr, this.name));
  }

  static fromApi(arr) {
    return this.fromJSON(arr);
  }

  eq(other) {
    if (this.length !== other.length) {
      return false;
    }

    for (let i = 0; i < this.length; i++) {
      if (!maybeEq(this[i], other[i])) {
        return false;
      }
    }

    return true;
  }
}

export default withEq(
  withCatchNull(withExtendedStaticProperties(['Classes'], TypedTuple)),
);
