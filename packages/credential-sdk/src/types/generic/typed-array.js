import { ArrayWithoutPrototypeMethods, ensureArrayLike } from '../../utils';
import { withExtendedStaticProperties } from '../../utils/inheritance';
import { maybeEq, maybeFrom, maybeToJSON } from '../../utils/interfaces';
import withBase from './with-base';
import withCatchNull from './with-catch-null';
import withEq from './with-eq';

/**
 * An `Array` of items where each item is an instance of the associated `Class`.
 */
class TypedArray extends withBase(ArrayWithoutPrototypeMethods) {
  /**
   * Item class.
   */
  static Class;

  constructor(...items) {
    if (items.length === 1 && typeof items[0] === 'number') {
      super(items[0]);

      return;
    }
    super(items.length);

    for (let idx = 0; idx < items.length; idx++) {
      try {
        this[idx] = maybeFrom(this.constructor.Class, items[idx]);
      } catch (error) {
        error.message = `\nFailed to set \`${idx}\` item of \`${this.constructor.name}\`:\n${error}`;

        throw error;
      }
    }
  }

  push(item) {
    return Array.prototype.push.call(
      this,
      maybeFrom(this.constructor.Class, item),
    );
  }

  unshift(item) {
    return Array.prototype.unshift.call(
      this,
      maybeFrom(this.constructor.Class, item),
    );
  }

  toJSON() {
    return [...Array.prototype.values.call(this)].map(maybeToJSON);
  }

  static fromApi(arr) {
    return new this(...ensureArrayLike(arr, this.name));
  }

  static fromJSON(arr) {
    return new this(...ensureArrayLike(arr, this.name));
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

  diff(other) {
    return {
      added: this.filter((item) => other.every((curItem) => !curItem.eq(item))),
      removed: other.filter((item) => this.every((nextItem) => !nextItem.eq(item))),
    };
  }
}

export default withEq(
  withCatchNull(withExtendedStaticProperties(['Class'], TypedArray)),
);
