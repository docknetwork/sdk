import { fmtIterable } from './types/iterable';
import { ensureNoIntersection } from './types/set';

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
// eslint-disable-next-line sonarjs/cognitive-complexity
export function withExtendedStaticProperties(properties, parentClass) {
  const name = `withExtStatics(${parentClass.name}, ${fmtIterable(
    properties,
  )})`;

  const extendedClass = {
    [name]: class extends parentClass {
      constructor(...args) {
        super(...args);

        /*
         * Ensures that properties are extended properly.
         */
        for (const property of properties) {
          try {
            if (this.constructor[property] === parentClass[property]) {
              throw new Error(
                `Static property \`${property}\` of \`${this.constructor.name}\` isn't extended properly`,
              );
            }
          } catch (err) {
            err.message = `Failed to check the prototype property: \n${err.message}`;

            throw err;
          }
        }
      }
    },
  };

  for (const property of properties) {
    const propertySymbol = Symbol(property);

    Object.defineProperty(extendedClass[name], property, {
      get() {
        if (
          this !== extendedClass[name]
          && this[propertySymbol] === parentClass[property]
        ) {
          throw new Error(
            `Property \`${property}\` of \`${this.name}\` isn't extended properly`,
          );
        }
        return this[propertySymbol];
      },
      set(newValue) {
        if (Object.hasOwnProperty.call(this, propertySymbol)) {
          throw new Error(
            `Can't override the property \`${property}\` of \`${this.name}\``,
          );
        }

        this[propertySymbol] = newValue;
      },
    });
  }

  return extendedClass[name];
}

/**
 * Enhances the provided class with the given list of prototype properties to require
 * in the inherited class.
 * All properties will be checked for presence during the object constructor call.
 * In case some property is missing, an error will be thrown.
 *
 * @template T
 * @param {Array<string>} properties
 * @param {T} parentClass
 * @returns {T}
 */
export function withExtendedPrototypeProperties(properties, parentClass) {
  const name = `withExtProto(${parentClass.name}, ${fmtIterable(properties)})`;

  const extendedClass = {
    [name]: class extends parentClass {
      constructor(...args) {
        super(...args);
        const proto = Object.getPrototypeOf(this);

        /*
         * Ensures that properties are extended properly.
         */
        for (const property of properties) {
          try {
            if (proto[property] === parentClass.prototype[property]) {
              throw new Error(
                `Property \`${property}\` of the object prototype of \`${this.constructor.name}\` isn't extended properly`,
              );
            }
          } catch (err) {
            err.message = `Failed to check the static property: \n${err.message}`;

            throw err;
          }
        }
      }
    },
  };

  return extendedClass[name];
}

const ObjectProperties = new WeakMap();

/**
 * Returns a Set containing all properties of the given object and its prototype chain.
 *
 * @param {Object} obj - The object to retrieve properties from.
 * @returns {Set} - A set of properties.
 */
export const allObjectPropertiesIncludingPrototypes = (obj) => {
  if (obj == null) return new Set();

  let props = ObjectProperties.get(obj);
  if (props == null) {
    props = new Set([
      ...Object.getOwnPropertyNames(obj),
      ...allObjectPropertiesIncludingPrototypes(Object.getPrototypeOf(obj)),
    ]);
    ObjectProperties.set(obj, props);
  }

  return props;
};

/**
 * Validates that object properties don't intersect with prototype properties.
 *
 * @param {Object} obj - The object to validate.
 */
export const validateProperties = (obj) => ensureNoIntersection(
  new Set(Object.getOwnPropertyNames(obj)),
  allObjectPropertiesIncludingPrototypes(Object.getPrototypeOf(obj)),
);

/**
 * Checks if an object is the prototype of another object.
 *
 * @param {Object} proto - The prototype object.
 * @param {Object} obj - The object to check against.
 * @returns {boolean} - Whether the object is the prototype.
 */
export const isPrototypeOf = (proto, obj) => Object.isPrototypeOf.call(proto, obj);

/**
 * Checks if an object is equal to or a prototype of another object.
 *
 * @param {Object} proto - The prototype object.
 * @param {Object} obj - The object to check.
 * @returns {boolean} - Whether the object is equal to or a prototype of the other.
 */
export const isEqualToOrPrototypeOf = (proto, obj) => Object.is(proto, obj) || isPrototypeOf(proto, obj);

/**
 * Ensures an object is equal to or a prototype of another object.
 *
 * @param {Object} proto - The prototype object to check against.
 * @param {Object} obj - The object to validate.
 * @returns {Object} - The validated object if it meets the requirement.
 * @throws {Error} - If the object doesn't match the prototype.
 */
export const ensureEqualToOrPrototypeOf = (proto, obj) => {
  if (isEqualToOrPrototypeOf(proto, obj)) {
    return obj;
  }

  throw new Error(
    `Expected \`${proto.name}\` to be equal to or a prototype of \`${obj.name}\``,
  );
};

/**
 * Creates a new class that extends the given class but hides prototype functions from
 * the original class on its own prototype. The resulting class will not have any
 * enumerable functions from the original class except for those explicitly ignored.
 *
 * @param {Function} klass - The original class to extend
 * @param {Set<string>} ignore - Optional set of member names to keep visible
 * @returns {Function} The new extended class without prototype functions
 */
export const withoutPrototypeFunctions = (klass, ignore = new Set()) => {
  const name = `withoutPrototypeFunctions(${klass.name})`;

  const obj = {
    [name]: class extends klass {},
  };

  for (const member of Object.getOwnPropertyNames(klass.prototype)) {
    if (!ignore.has(member) && typeof klass.prototype[member] === 'function') {
      Object.defineProperty(obj[name].prototype, member, {
        enumerable: false,
      });
    }
  }

  return obj[name];
};

/**
 * Ensures that the given value is an instance of the specified class. Throws an error with details if not.
 *
 * @param {*} value - The value to check.
 * @param {Function} klass - The constructor or class to check against.
 * @throws If value is not a Uint8Array.
 * @returns {*} - The original value if it's an instance of the class.
 */
export const ensureInstanceOf = (value, klass) => {
  if (value instanceof klass) {
    return value;
  }

  throw new Error(
    `Expected \`${value}\` with constructor \`${value?.constructor.name}\` to be an instance of \`${klass.name}\``,
  );
};

/**
 * Ensures that the given prototype is that of the value. Throws an error with a message if not.
 *
 * @param {object} proto - The expected prototype.
 * @param {*} value - The value to check.
 * @returns {*} - The original value if it has the correct prototype.
 */
export const ensurePrototypeOf = (proto, value) => {
  if (isPrototypeOf(proto, value)) {
    return value;
  }

  throw new Error(
    `Expected \`${proto.name}\` to be a prototype of \`${value}\``,
  );
};
