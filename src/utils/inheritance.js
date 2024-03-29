/**
 * Enhances the provided class with the given list of static properties to require
 * in the inherited class.
 * All properties will be checked for presence during the object constructor call.
 * Each property on its own will be checked every time it is accessed.
 * In case some property is missing, an error will be thrown.
 *
 * @template T
 * @param {Array<string>} properties
 * @param {T} parentClass
 * @returns {T}
 */
export function withExtendedStaticProperties(properties, parentClass) {
  const extendedClass = class extends parentClass {
    constructor(...args) {
      super(...args);

      /*
       * Ensures that properties are extended properly.
       */
      for (const property of properties) {
        if (this.constructor[property] == null) {
          throw new Error(
            `Static property \`${property}\` of \`${this.constructor.name}\` isn't extended properly`,
          );
        }
      }
    }
  };

  for (const property of properties) {
    const propertySymbol = Symbol(property);

    Object.defineProperty(extendedClass, property, {
      get() {
        return this[propertySymbol];
      },
      set(newValue) {
        if (this[propertySymbol] != null) {
          throw new Error(
            `Can't override the property \`${property}\` of \`${this.name}\``,
          );
        }

        this[propertySymbol] = newValue;
      },
    });
  }

  return extendedClass;
}
