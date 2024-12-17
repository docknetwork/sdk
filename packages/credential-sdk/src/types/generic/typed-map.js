import {
  maybeEq,
  maybeFrom,
  maybeToJSON,
  maybeToJSONString,
} from '../../utils/interfaces';
import { withExtendedStaticProperties } from '../../utils/inheritance';
import withBase from './with-base';
import withCatchNull from './with-catch-null';
import withEq from './with-eq';

class TypedMap extends withBase(Map) {
  static KeyClass;

  static ValueClass;

  constructor(values = []) {
    super();

    this.keysAsKeyClass = new Map();

    for (const [key, value] of values) {
      this.set(key, value);
    }
  }

  keyAsKeyClass(key) {
    const asKeyClass = maybeFrom(this.constructor.KeyClass, key);
    const strKey = maybeToJSONString(asKeyClass);

    if (this.keysAsKeyClass.has(strKey)) {
      return this.keysAsKeyClass.get(strKey);
    } else {
      this.keysAsKeyClass.set(strKey, asKeyClass);

      return asKeyClass;
    }
  }

  set(key, value) {
    return super.set(
      this.keyAsKeyClass(key),
      maybeFrom(this.constructor.ValueClass, value),
    );
  }

  get(key) {
    return super.get(this.keyAsKeyClass(key));
  }

  has(key) {
    return super.has(this.keyAsKeyClass(key));
  }

  delete(key) {
    const removed = super.delete(this.keyAsKeyClass(key));
    if (removed) this.keysAsKeyClass.delete(key);

    return removed;
  }

  clear() {
    this.clear();
    this.keysAsKeyClass.clear();
  }

  toJSON() {
    return [...this.entries()]
      .map(([key, value]) => [maybeToJSON(key), maybeToJSON(value)])
      .sort(([k1], [k2]) => String(k1).localeCompare(String(k2)));
  }

  static fromJSON(entries) {
    return new this(
      [...entries].map(([key, value]) => [
        this.KeyClass.fromJSON(key),
        this.ValueClass.fromJSON(value),
      ]),
    );
  }

  static fromApi(obj) {
    return new this(
      [...obj.entries()].map(([key, value]) => [
        this.KeyClass.fromApi(key),
        this.ValueClass.fromApi(value),
      ]),
    );
  }

  static from(obj) {
    if (obj instanceof this) {
      return obj;
    } else if (Array.isArray(obj)) {
      return this.fromJSON(obj);
    } else if (obj && typeof obj === 'object') {
      return this.fromApi(obj);
    } else {
      return new this(obj);
    }
  }

  eq(other) {
    return (
      this.size === other.size
      && this.entries().all(([key, value]) => maybeEq(other.get(key), value))
    );
  }

  diff(other) {
    return {
      added: new this.constructor(
        [...this.keys()]
          .filter((key) => !other.has(key))
          .map((key) => [key, this.get(key)]),
      ),
      removed: new this.constructor(
        [...other.keys()]
          .filter((key) => !this.has(key))
          .map((key) => [key, other.get(key)]),
      ),
      modified: new this.constructor(
        [...this.keys()]
          .filter((key) => other.has(key) && !this.get(key).eq(other.get(key)))
          .map((key) => [key, this.get(key)]),
      ),
    };
  }
}

export default withEq(
  withCatchNull(
    withExtendedStaticProperties(['KeyClass', 'ValueClass'], TypedMap),
  ),
);
