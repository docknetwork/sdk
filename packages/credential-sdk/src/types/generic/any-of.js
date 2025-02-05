import { fmtIter } from '../../utils';
import withFrom from './with-from';

class NeverInstantiated {
  constructor() {
    throw new Error("Shouldn't be invoked with `new`");
  }
}

/**
 * Creates a new type that can be constructed from any of the provided types.
 * The resulting type will attempt to parse a value using each provided type in order,
 * returning the first successful construction or throwing an error if none succeed.
 *
 * @template {} T
 * @param {...T[]} classes - Array of types to try constructing from
 * @returns {anyOfTypes<T>} A new type that can be constructed from any of the provided types
 */
export default function anyOf(...classes) {
  const name = `anyOf(${fmtIter(classes.map((klass) => klass.name))})`;

  const from = (value) => {
    let err;

    for (const klass of classes) {
      try {
        return klass.from(value);
      } catch (e) {
        if (err != null) {
          e.message = `${err.message}; ${e.message}`;
        }

        err = e;
      }
    }

    throw err;
  };
  const obj = {
    [name]: class extends withFrom(NeverInstantiated, from) {},
  };

  return obj[name];
}
