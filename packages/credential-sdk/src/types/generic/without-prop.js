import { isEqualToOrPrototypeOf } from '../../utils';
import TypedEnum from './typed-enum';
import TypedStruct from './typed-struct';

/**
 * Extends supplied class which must be a successor of `TypedStruct`/`TypedEnum` by removing
 * its property.
 *
 * @template C
 * @template K
 * @param {C} klass
 * @param {string} prop
 * @param {K} PropClass
 * @param {function(*, string, K): *} handleNested
 * @returns {C}
 */
export default function withoutProp(klass, prop, handleNested = withoutProp) {
  const name = `withoutProp(${klass.name}, ${prop})`;
  const isStruct = isEqualToOrPrototypeOf(TypedStruct, klass);
  const isEnum = isEqualToOrPrototypeOf(TypedEnum, klass);
  if (!isStruct && !isEnum) {
    throw new Error(`Unexpected class provided: \`${klass}\``);
  }

  if (isStruct) {
    const { [prop]: _, ...classes } = klass.Classes;

    const obj = {
      [name]: class extends klass {
        static Classes = classes;
      },
    };

    return obj[name];
  } else {
    let classWithProp = klass.Class;
    let variants = klass.Variants;
    if (classWithProp != null) {
      classWithProp = handleNested(klass.Class, prop);
    } else {
      variants = variants.map((variant) => handleNested(variant, prop));
    }

    const obj = {
      [name]: class extends klass {
        static Class = classWithProp;

        static Variants = variants;
      },
    };

    return obj[name];
  }
}
