/* eslint-disable  max-classes-per-file */
import { fmtIter } from "../../utils/generic";
import {
  isEqualToOrPrototypeOf,
  withExtendedStaticProperties,
} from "../../utils/inheritance";
import {
  maybeEq,
  maybeFrom,
  maybeNew,
  maybeToJSON,
} from "../../utils/interfaces";
import withBase from "./with-base";
import Null from "./typed-null";
import withCatchNull from "./with-catch-null";
import withEq from "./with-eq";

/**
 * @template V
 */
class TypedEnum extends withBase(class EnumBase {}) {
  /**
   * Possible subclasses.
   * @type {Array<this>}
   * @static Variants
   */
  static Variants;

  /**
   * Class used to construct underlying value.
   * @type {Function}
   * @static Class
   */
  static Class;

  /**
   * The type of the enumeration.
   * @type {string}
   * @static
   */
  static get Type() {
    return this.Class.Type;
  }

  /**
   * Associates enum parameters with the base enum class and vice versa.
   * @template Class
   * @param {...this} classes
   */
  /* eslint-disable */
  static bindVariants(...classes) {
    class ClassIsBoundError extends Error {
      constructor(klass) {
        super(`Class \`${klass}\` is already bound`);
      }
    }

    if (Object.hasOwnProperty(this, "Variants")) {
      throw new ClassIsBoundError(this);
    }

    for (const klass of classes) {
      if (klass === this) {
        throw new Error(`\`${klass.name}\` can't be a variant of itself`);
      }
      if (!klass.Type)
        throw new Error(`No \`Type\` specified in \`${klass.name}\``);

      const { Class, Type, isIdentifier, asIdentifier } = klass;

      Object.defineProperty(this.prototype, isIdentifier, {
        get() {
          return this instanceof klass;
        },
        enumerable: false,
      });

      Object.defineProperty(this.prototype, asIdentifier, {
        get() {
          if (this[isIdentifier]) {
            return this[Type];
          } else {
            throw new Error(`Not a \`${Type}\``);
          }
        },
        enumerable: false,
      });

      const that = this;

      // TODO: revisit this
      if (Class.Variants) {
        const klassFrom = Class.from;

        for (const Variant of Class.Variants) {
          Variant.from = function from(value) {
            if (value instanceof that) {
              return klassFrom.call(this, value[asIdentifier]);
            } else {
              return klassFrom.call(this, value);
            }
          };
        }
      }

      const klassFrom = Class.from;
      Class.from = function from(value) {
        if (value instanceof that) {
          return value[asIdentifier];
        } else {
          return klassFrom.call(this, value);
        }
      };
    }

    this.Variants = classes;
  }
  /* eslint-enable */

  static get isIdentifier() {
    const { JsonType } = this;

    return `is${JsonType}`;
  }

  static get asIdentifier() {
    const { JsonType } = this;

    return `as${JsonType}`;
  }

  static get JsonType() {
    const { Type } = this;

    return `${Type[0].toUpperCase()}${Type.slice(1)}`;
  }

  /**
   * Create a new TypedEnum instance.
   * @param {V} value - The value of the enumeration.
   */
  constructor(value) {
    super();

    const { Class, name } = this.constructor;

    if (Class == null) {
      throw new Error(`\`Class\` property is not specified for \`${name}\``);
    }

    try {
      this[this.type] = maybeFrom(Class, value);
    } catch (error) {
      error.message = `\nFailed to construct variant \`${Class.name}\` of \`${name}\`:\n${error}`;

      throw error;
    }
  }

  /**
   * Get the type of the enumeration.
   * @returns {string} The type of the enumeration.
   */
  get type() {
    return this.constructor.Type;
  }

  get jsonType() {
    return this.constructor.JsonType;
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
    if (this.constructor.isNullish) {
      return this.constructor.JsonType;
    } else {
      const { type, value } = this;

      return {
        [type]: maybeToJSON(value),
      };
    }
  }

  // eslint-disable-next-line
  static fromJSON(json) {
    if (json == null) {
      throw new Error(
        `Received \`null\` while object was expected by \`${this.name}\``
      );
    }
    if (typeof json === "string" && this.isNullish) {
      if (this.Class != null) {
        if (this.JsonType === json || this.Type === json) {
          return maybeNew(this, []);
        }

        throw new Error(
          `Unexpected json in \`${this}\`: \`${json}\`, expected \`${this.JsonType}\``
        );
      } else {
        for (const Variant of this.Variants) {
          if (Variant.JsonType === json || Variant.Type === json) {
            return Variant.fromJSON(json);
          }
        }

        throw new Error(
          `Unexpected json in \`${this}\`: \`${json}\`, expected one of ${fmtIter(
            new Set([...this.Variants].flatMap((v) => [v.JsonType, v.Type]))
          )}`
        );
      }
    }

    const keys = Object.keys(json);
    if (keys.length !== 1) {
      throw new Error(
        `Expected object with 1 key, received \`${json}\` with keys: ${fmtIter(
          keys
        )} by ${this.name}`
      );
    }
    const [key] = keys;

    if (this.Class != null) {
      if (this.JsonType === key || this.Type === key) {
        return maybeNew(this, [json[key]]);
      }

      throw new Error(
        `Unexpected key \`${key}\`, expected \`${this.JsonType}\` by \`${this.name}\``
      );
    } else {
      for (const Variant of this.Variants) {
        if (Variant.JsonType === key || Variant.Type === key) {
          return Variant.fromJSON(json);
        }
      }

      throw new Error(
        `Invalid key \`${key}\`, expected one of ${fmtIter(
          new Set([...this.Variants].flatMap((v) => [v.JsonType, v.Type]))
        )} by \`${this.name}\``
      );
    }
  }

  static fromApi(obj) {
    if (this.Class != null) {
      if (obj[this.isIdentifier]) {
        return maybeNew(this, [obj[this.asIdentifier]]);
      } else {
        throw new Error(
          `Incompatible value provided: \`${obj}\` to \`${this}\``
        );
      }
    } else {
      for (const Variant of this.Variants) {
        if (obj[Variant.isIdentifier]) {
          return Variant.fromApi(obj);
        }
      }
    }

    throw new Error(
      `Invalid object received: \`${maybeToJSON(
        obj
      )}\`, expected to build an instance of ${fmtIter(
        this.Variants.map((v) => v.Type)
      )} by \`${this.name}\``
    );
  }

  static variant(obj) {
    return this.Variants.find((variant) =>
      isEqualToOrPrototypeOf(variant.Class, obj?.constructor ?? Null)
    );
  }

  static directVariant(obj) {
    return this.Variants.find((variant) =>
      isEqualToOrPrototypeOf(variant, obj?.constructor ?? Null)
    );
  }

  static get isNullish() {
    return this.Class
      ? this.Class === Null
      : this.Variants.every((variant) => variant.Class === Null);
  }

  static from(obj) {
    if (obj instanceof this) {
      return obj;
    } else if (typeof obj === "string" && this.isNullish) {
      return this.fromJSON(obj);
    } else if (Object.getPrototypeOf(obj) === Object.getPrototypeOf({})) {
      return this.fromJSON(obj);
    } else if (this.Class == null) {
      const Variant = this.variant(obj);

      if (Variant) {
        return new Variant(obj);
      } else {
        const DirectVariant = this.directVariant(obj);

        if (DirectVariant != null) {
          return DirectVariant.from(obj);
        }
      }
    } else if (obj instanceof this.Class) {
      return new this(this.Class.from(obj));
    }

    return this.fromApi(obj);
  }

  eq(other) {
    return this.type === other.type && maybeEq(this.value, other.value);
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }
}

export default withEq(
  withCatchNull(withExtendedStaticProperties(["Variants"], TypedEnum))
);
