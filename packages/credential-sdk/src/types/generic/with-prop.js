import withProps from './with-props';

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
  return withProps(klass, { [prop]: PropClass }, (k, _) => handleNested(k, prop, PropClass));
}
