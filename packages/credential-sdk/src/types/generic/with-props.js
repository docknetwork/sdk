import { mapObj } from '../../utils/types';
import { isEqualToOrPrototypeOf } from '../../utils/inheritance';
import TypedEnum from './typed-enum';
import TypedStruct from './typed-struct';

/**
 * Extends supplied class which must be a successor of `TypedStruct`/`TypedEnum` by adding/overriding
 * its properties classes.
 *
 * @template C
 * @template K
 * @param {C} klass
 * @param {Object<string, K>} propertiesToOverride
 * @param {function(*, Object<string, K>): *} handleNested
 * @returns {C}
 */
export default function withProps(
  klass,
  propertiesToOverride,
  handleNested = withProps,
) {
  const fnName = `withProps(${klass.name}, ${JSON.stringify(
    mapObj(propertiesToOverride, ({ name }) => name),
  )})`;
  const isStruct = isEqualToOrPrototypeOf(TypedStruct, klass);
  const isEnum = isEqualToOrPrototypeOf(TypedEnum, klass);
  if (!isStruct && !isEnum) {
    throw new Error(`Unexpected class provided: \`${klass}\``);
  }

  if (isStruct) {
    const obj = {
      [fnName]: class extends klass {
        static Classes = {
          ...klass.Classes,
          ...propertiesToOverride,
        };
      },
    };

    return obj[fnName];
  } else {
    const obj = {
      [fnName]:
        klass.Class != null
          ? class extends klass {
            static Class = handleNested(klass.Class, propertiesToOverride);
          }
          : class extends klass {
            static Variants = klass.Variants.map((variant) => handleNested(variant, propertiesToOverride));
          },
    };

    return obj[fnName];
  }
}
