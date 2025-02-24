import {
  allObjectPropertiesIncludingPrototypes,
  withExtendedStaticProperties,
} from '../../utils';

/**
 * Extends supplied class to check that its itstance lenght is always equal to the `static Size` property
 * defined on the extended class.
 *
 * @template C
 * @param {C} klass
 * @param {function(*): number} getSize
 * @returns {C}
 */
export default function sized(klass, getSize = ({ length }) => length) {
  const name = `Sized<${klass.name}>`;
  const methods = [
    ...allObjectPropertiesIncludingPrototypes(klass.prototype),
  ].filter(
    (prop) => typeof klass.prototype[prop] === 'function' && prop !== 'constructor',
  );

  const obj = {
    [name]: class extends klass {
      static Size;

      constructor(...args) {
        super(...args);

        this.ensureValidSize();
      }

      ensureValidSize() {
        const { Size } = this.constructor;

        if (typeof Size !== 'number') {
          throw new Error(
            `Size must be a number, received \`${Size?.toString()}\``,
          );
        }

        const size = getSize(this);

        if (size !== Size) {
          throw new Error(
            `Received \`${size}\` items while expected \`${Size}\` by \`${this.constructor.name}\``,
          );
        }
      }

      static random() {
        return super.random(this.Size);
      }
    },
  };

  for (const method of methods) {
    // eslint-disable-next-line func-names
    obj[name].prototype[method] = function (...args) {
      const res = klass.prototype[method].apply(this, args);
      this.ensureValidSize();

      return res;
    };
  }

  return withExtendedStaticProperties(['Size'], obj[name]);
}
