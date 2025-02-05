import { isEqualToOrPrototypeOf } from '../../utils';
import TypedEnum from './typed-enum';
import TypedStruct from './typed-struct';

/**
 * Extends supplied class which must be a successor of `TypedStruct`/`TypedEnum` by adding/overriding
 * its properties classes.
 *
 * @template C
 * @template K
 * @param {C} klass
 * @param {{ [string]: K }} propertiesToOverride
 * @param {function(*, string, K): *} handleNested
 * @returns {C}
 */
export default function withProps(
  klass,
  propertiesToOverride,
  handleNested = withProps,
) {
  const name = `withProps(${klass.name}, ${JSON.stringify(
    propertiesToOverride,
  )})`;
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
          ...propertiesToOverride,
        };
      },
    };

    return obj[name];
  } else {
    const obj = {
      [name]:
        klass.Class != null
          ? class extends klass {
            static Class = handleNested(klass.Class, propertiesToOverride);
          }
          : class extends klass {
            static Variants = klass.Variants.map((variant) => handleNested(variant, propertiesToOverride));
          },
    };

    return obj[name];
  }
}
