import { stringToU8a, u8aToString } from '../../utils';
import {
  withExtendedStaticProperties,
  withExtendedPrototypeProperties,
} from '../../utils/inheritance';
import { applyToValue, maybeEq } from '../../utils/interfaces';
import withCatchNull from './with-catch-null';
import withEq from './with-eq';

/**
 * Enhances provided class by adding prototype methods `toString`/`eq`, static `from` and requiring
 * successor to implement static `fromJSON`/`fromApi` and prototype `toJSON`.
 *
 * @templace C
 * @param {C} klass
 * @returns {C}
 */
export default function withBase(klass) {
  const name = `withBase(${klass.name})`;

  const classes = {
    [name]: class extends klass {
      /**
       * Attempts to instantiate `this` from the provided JSON object.
       * @param {object} json
       */
      static fromJSON(_json) {
        throw new Error('Unimplemented');
      }

      /**
       * Attempts to instantiate `this` from the provided object received from the API side.
       * @param {object} json
       */
      static fromApi(_obj) {
        throw new Error('Unimplemented');
      }

      /**
       * Instantiates `this` from the supplied object.
       * @param obj
       */
      static from(obj) {
        if (obj instanceof this) {
          return obj;
        } else if (Object.getPrototypeOf(obj) === Object.getPrototypeOf({})) {
          return this.fromJSON(obj);
        } else if (obj instanceof Uint8Array) {
          return this.fromJSON(JSON.parse(u8aToString(obj)));
        } else {
          return this.fromApi(obj);
        }
      }

      /**
       * Converts the instance to a JSON representation.
       * @returns {object} The JSON representation of the instance.
       */
      toJSON() {
        throw new Error('Unimplemented');
      }

      /**
       * Converts the instance to a stringified JSON representation.
       * @returns {string} The JSON representation of the instance.
       */
      toJSONString() {
        return JSON.stringify(this.toJSON());
      }

      /**
       * Converts the instance to bytes of the stringified JSON representation.
       * @returns {Uint8Array} The JSON representation of the instance.
       */
      toJSONStringBytes() {
        return stringToU8a(this.toJSONString());
      }

      /**
       * Converts the instance to a string representation.
       * @returns {string}
       */
      toString() {
        return JSON.stringify(this.toJSON());
      }

      /**
       * Applies supplied function to the underlying value if `check` returns `true`.
       * Otherwise, attempts to do the same on the inner value.
       *
       * @template T
       * @param {function(this): T} fn
       * @returns {T}
       */
      applyToValue(check, fn) {
        if (check(this)) {
          return fn(this);
        }
        const { value } = this;
        const hasValue = typeof value !== 'undefined';

        return applyToValue(check, fn, value ?? this, hasValue);
      }

      /**
       * Performs an equality check against other value.
       *
       * @param {*} other
       * @returns {boolean}
       */
      eq(other) {
        return maybeEq(this.value, other.value);
      }
    },
  };

  return withExtendedStaticProperties(
    ['fromJSON', 'fromApi'],
    withExtendedPrototypeProperties(
      ['toJSON'],
      withEq(withCatchNull(classes[name])),
    ),
  );
}
