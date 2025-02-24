import TypedEnum from './typed-enum';
import { fmtIterable, isEqualToOrPrototypeOf, maybeNew } from '../../utils';

/**
 * Extends supplied class which must be a successor of `TypedEnum` in a way that every of the methods
 * `from`/`fromJSON`/`fromApi` will return `null` if variant of the provided value is not the same as the underlying type.
 *
 * @template C
 * @param {C} klass
 * @returns {C}
 */
/* eslint-disable sonarjs/cognitive-complexity */
export default function withNullIfNotAVariant(klass) {
  if (!isEqualToOrPrototypeOf(TypedEnum, klass)) {
    throw new Error('Expected  `{klass.name}` to extend `TypedEnum`');
  } else if (klass.Class == null) {
    throw new Error(
      `Expected static \`Class\` property to be present in \`${klass.name}\``,
    );
  }
  const name = `withNullIfNotAVariant(${klass.name})`;

  const classObj = {
    [name]: class extends klass {
      static fromJSON(value) {
        const keys = Object.keys(value);
        if (keys.length !== 1) {
          throw new Error(
            `Expected object with 1 key, received \`${value}\` with keys: ${fmtIterable(
              keys,
            )} by ${this.name}`,
          );
        }
        const [key] = keys;

        if (this.JsonType === key || this.Type === key) {
          return super.from(value);
        }

        return null;
      }

      static fromApi(obj) {
        if (obj[this.isIdentifier]) {
          return maybeNew(this, [obj[this.asIdentifier]]);
        } else {
          return null;
        }
      }

      static from(obj) {
        if (obj instanceof this) {
          return obj;
        } else if (typeof obj === 'string' && this.isNullish) {
          return this.fromJSON(obj);
        } else if (Object.getPrototypeOf(obj) === Object.getPrototypeOf({})) {
          return this.fromJSON(obj);
        } else if (obj instanceof this.Class) {
          return new this(this.Class.from(obj));
        }

        return this.fromApi(obj);
      }
    },
  };

  return classObj[name];
}
