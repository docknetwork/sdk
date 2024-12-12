import {
  maybeFrom,
  maybeToJSON,
  maybeToJSONString,
} from '../../utils/interfaces';
import { withExtendedStaticProperties } from '../../utils/inheritance';
import withCatchNull from './with-catch-null';
import withEq from './with-eq';
import withBase from './with-base';

class TypedSet extends withBase(Set) {
  static Class;

  constructor(values = []) {
    super();

    this.valuesAsClass = new Map();

    for (const value of values) {
      this.add(value);
    }
  }

  valueAsClass(value) {
    const valuesAsClass = maybeFrom(this.constructor.Class, value);
    const valueStr = maybeToJSONString(valuesAsClass);

    if (this.valuesAsClass.has(valueStr)) {
      return this.valuesAsClass.get(valueStr);
    } else {
      this.valuesAsClass.set(valueStr, valuesAsClass);

      return valuesAsClass;
    }
  }

  delete(key) {
    const removed = super.delete(this.valueAsClass(key));
    if (removed) this.valuesAsClass.delete(key);

    return removed;
  }

  add(value) {
    return super.add(this.valueAsClass(value));
  }

  has(value) {
    return super.has(this.valueAsClass(value));
  }

  toJSON() {
    return [...this.values()].map(maybeToJSON).sort();
  }

  clear() {
    this.clear();
    this.valuesAsClass.clear();
  }

  static fromJSON(values) {
    return new this(values);
  }

  static fromApi(value) {
    return new this(value.values());
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
      this.size === other.size && this.values().all((value) => other.has(value))
    );
  }
}

export default withEq(
  withCatchNull(withExtendedStaticProperties(['Class'], TypedSet)),
);
