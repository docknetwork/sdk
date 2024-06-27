/* eslint-disable  max-classes-per-file */
import { withExtendedStaticProperties } from './inheritance';

export const TypedEnum = withExtendedStaticProperties(
  ['Type'],
  /**
   * @template V
   */
  class TypedEnum {
    /**
     * The type of the enumeration.
     * @type {string}
     * @static
     */
    static Type;

    /**
     * Create a new TypedEnum instance.
     * @param {V} value - The value of the enumeration.
     */
    constructor(value) {
      this[this.type] = value;
    }

    /**
     * Get the type of the enumeration.
     * @returns {string} The type of the enumeration.
     */
    get type() {
      return this.constructor.Type;
    }

    /**
     * Get the value of the enumeration.
     * @returns {V} The value of the enumeration.
     */
    get value() {
      return this[this.type];
    }

    /**
     * Convert the instance to a JSON representation.
     * @returns {Object} The JSON representation of the instance.
     */
    toJSON() {
      const key = `${this.type[0].toUpperCase()}${this.type.slice(1)}`;
      const value = this.value && typeof this.value.toJSON === 'function'
        ? this.value.toJSON()
        : this.value;

      return {
        [key]: value,
      };
    }
  },
);

export const SizedTypedEnum = withExtendedStaticProperties(
  ['Size'],
  /**
   * @template V
   * @extends TypedEnum<V>
   */
  class SizedTypedEnum extends TypedEnum {
    /**
     * The size of underlying value.
     * @type {number}
     * @static
     */
    static Size;

    /**
     * Create a new SizedTypedEnum instance.
     * @param {V} value - The value of the enumeration.
     */
    constructor(value) {
      super(value);

      this.constructor.validateSize(value);
    }

    /**
     * Validate the size of the value. To be implemented by subclasses.
     * @param {V} _value - The value to validate.
     * @throws {Error} Throws an error if the method is not implemented.
     */
    static validateSize(_value) {
      throw new Error('Unimplemented');
    }
  },
);
