import anyOf from './any-of';

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
        } else {
          let compareWith = other;
          const { value, constructor } = this;
          const tryFrom = [
            constructor,
            value?.constructor,
            value?.constructor?.Class,
          ].filter((fn) => typeof fn?.from === 'function');
          try {
            compareWith = constructor.from(anyOf(...tryFrom).from(compareWith));
          } catch (err) {
            console.log(
              err,
              tryFrom.map((v) => v.name),
            );
            return false;
          }

          return super.eq(compareWith);
        }
      }
    },
  };

  return obj[name];
}
