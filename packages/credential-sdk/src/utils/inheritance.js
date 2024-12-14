import { fmtIter } from "./generic";

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
  const name = `withExtStatics(${parentClass.name}, ${fmtIter(properties)})`;

  const extendedClass = {
    [name]: class extends parentClass {
      constructor(...args) {
        super(...args);

        /*
         * Ensures that properties are extended properly.
         */
        for (const property of properties) {
          if (this.constructor[property] === parentClass[property]) {
            throw new Error(
              `Static property \`${property}\` of \`${this.constructor.name}\` isn't extended properly`
            );
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
          this !== extendedClass[name] &&
          this[propertySymbol] === parentClass[property]
        ) {
          throw new Error(
            `Property \`${property}\` of \`${this.name}\` isn't extended properly`
          );
        }
        return this[propertySymbol];
      },
      set(newValue) {
        if (Object.hasOwnProperty.call(this, propertySymbol)) {
          throw new Error(
            `Can't override the property \`${property}\` of \`${this.name}\``
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
  const name = `withExtProto(${parentClass.name}, ${fmtIter(properties)})`;

  const extendedClass = {
    [name]: class extends parentClass {
      constructor(...args) {
        super(...args);
        const proto = Object.getPrototypeOf(this);

        /*
         * Ensures that properties are extended properly.
         */
        for (const property of properties) {
          if (proto[property] === parentClass.prototype[property]) {
            throw new Error(
              `Property \`${property}\` of the object prototype of \`${this.constructor.name}\` isn't extended properly`
            );
          }
        }
      }
    },
  };

  return extendedClass[name];
}

export const ensurePropertiesAreUnique = (reservedFields, fields) => {
  for (const field of fields) {
    if (reservedFields.has(field)) {
      throw new Error(`Property \`${field}\` is reserved`);
    }
  }
};

const ObjectProperties = new WeakMap();

export const allProperties = (obj) => {
  if (obj == null) return new Set();

  let props = ObjectProperties.get(obj);
  if (props == null) {
    props = new Set([
      ...Object.getOwnPropertyNames(obj),
      ...allProperties(Object.getPrototypeOf(obj)),
    ]);
    ObjectProperties.set(obj, props);
  }

  return props;
};

export const validateProperties = (obj) =>
  ensurePropertiesAreUnique(
    new Set(Object.getOwnPropertyNames(obj)),
    allProperties(Object.getPrototypeOf(obj))
  );

export const isPrototypeOf = (proto, obj) =>
  Object.isPrototypeOf.call(proto, obj);

export const isEqualToOrPrototypeOf = (proto, obj) =>
  Object.is(proto, obj) || isPrototypeOf(proto, obj);

export const ensureEqualToOrPrototypeOf = (proto, obj) => {
  if (!isEqualToOrPrototypeOf(proto, obj)) {
    throw new Error(
      `Expected ${proto.name} to be equal to or a prototype of ${obj.name}`
    );
  }

  return obj;
};
