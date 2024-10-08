import { isEqualToOrPrototypeOf } from '../../utils';

/**
 * Enhances `prototype.eq` of the provided class to make it catch `null`ish values and
 * attempt to instantiate a new value of the supplied class in case if constructor is different.
 * @template C
 * @param {C} klass
 * @returns {C}
 */
export default function withEq(klass) {
  const name = `withEq(${klass.name})`;

  const obj = {
    [name]: class extends klass {
      eq(other) {
        if (other == null) {
          return false;
        } else if (Object.is(this, other)) {
          return true;
        } else if (!isEqualToOrPrototypeOf(klass, other.constructor)) {
          let compareWith;
          try {
            compareWith = this.constructor.from(other);
          } catch {
            return false;
          }

          return super.eq(compareWith);
        } else {
          return super.eq(other);
        }
      }
    },
  };

  return obj[name];
}
