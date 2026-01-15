import { stringToU8a } from '../../utils/types';
import {
  withExtendedStaticProperties,
  withExtendedPrototypeProperties,
} from '../../utils/inheritance';
import { maybeEq, maybeToJSON } from '../../utils/interfaces';
import withCatchNull from './with-catch-null';
import withEq from './with-eq';
import withFromJSONBytes from './with-from-json-bytes';

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
        } else {
          return this.fromApi(obj);
        }
      }

      /**
       * Converts the instance to a JSON representation.
       * @returns {object} The JSON representation of the instance.
       */
      toJSON() {
        return this.apply(maybeToJSON);
      }

      /**
       * Recursively applies supplied function to the underlying values.
       * @template T
       * @param {function(this): T} _fn
       * @returns {T}
       */
      apply(_fn) {
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
      ['apply'],
      withFromJSONBytes(withEq(withCatchNull(classes[name]))),
    ),
  );
}
