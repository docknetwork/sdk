import { isEqualToOrPrototypeOf } from '../../utils';
import TypedEnum from './typed-enum';
import TypedStruct from './typed-struct';

/**
 * Extends supplied class which must be a successor of `TypedStruct`/`TypedEnum` by adding/overriding
 * its property class.
 *
 * @template C
 * @template K
 * @param {C} klass
 * @param {string} prop
 * @param {K} PropClass
 * @param {function(*, string, K): *} handleNested
 * @returns {C}
 */
export default function withProp(
  klass,
  prop,
  PropClass,
  handleNested = withProp,
) {
  const name = `withProp(${klass.name}, ${prop})`;
  const isStruct = isEqualToOrPrototypeOf(TypedStruct, klass);
  const isEnum = isEqualToOrPrototypeOf(TypedEnum, klass);
  if (!isStruct && !isEnum) {
    throw new Error(`Unexpected class provided: \`${klass}\``);
  }

  if (isStruct) {
    const obj = {
      [name]: class extends klass {
        static Classes = {
          ...klass.Classes,
          [prop]: PropClass,
        };
      },
    };

    return obj[name];
  } else {
    const obj = {
      [name]:
        klass.Class != null
          ? class extends klass {
            static Class = handleNested(klass.Class, prop, PropClass);
          }
          : class extends klass {
            static Variants = klass.Variants.map((variant) => handleNested(variant, prop, PropClass));
          },
    };

    return obj[name];
  }
}
