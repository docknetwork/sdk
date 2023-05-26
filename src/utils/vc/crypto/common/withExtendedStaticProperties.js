/**
 * Enhances the provided class with the given list of static properties to require
 * in the inherited class.
 * All properties will be checked for presence during the object constructor call.
 * Each property on its own will be checked every time it will be accessed.
 * In case some property is missing, an error will be thrown.
 * @param {*} properties
 * @param {*} parentClass
 */
export default function withExtendedStaticProperties(properties, parentClass) {
  class WithExtendedStaticProperties extends parentClass {
    constructor(...args) {
      super(...args);

      /*
       * Ensures that properties were extended properly.
       */
      for (const property of properties) {
        if (this.constructor[property] == null) {
          throw new Error(
            `Static property \`${property}\` of \`${this}\` isn't extended properly`,
          );
        }
      }
    }
  }

  for (const property of properties) {
    Object.defineProperty(WithExtendedStaticProperties, property, {
      get() {
        const value = this[`_@${property}`];
        if (value == null) {
          throw new Error(
            `Static property \`${property}\` of \`${this}\` isn't extended properly`,
          );
        }

        return value;
      },
      set(newValue) {
        if (newValue == null) {
          throw new Error(
            `Attempt to set \`null\`ish value to the property \`${property}\` of \`${this}\``,
          );
        }

        this[`_@${property}`] = newValue;
      },
    });
  }

  return WithExtendedStaticProperties;
}
