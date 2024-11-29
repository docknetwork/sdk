import TypedBytes from './typed-bytes';
import {
  withExtendedStaticProperties,
  withExtendedPrototypeProperties,
} from '../../utils/inheritance';
import { maybeFrom } from '../../utils/interfaces';
import withFrom from './with-from';
import { fmtIter } from '../../utils';
import TypedString from './typed-string';

/**
 * Extends supplied class.
 * @template C
 * @param {C} klass
 * @param {boolean} wrapper
 * @returns {C}
 */
/* eslint-disable */
export default function withQualifier(klass, wrapper = false) {
  const name = `withQualifier(${klass.name})`;

  if (wrapper) {
    const classes = {
      [name]: class extends klass {
        static get Qualifier() {
          return this.Class?.Qualifier;
        }

        static get Qualifiers() {
          return [].concat(
            this.Qualifier ?? this.Class?.Qualifiers ??
              this.Variants.flatMap((variant) =>
                [].concat(
                  variant.Qualifier ?? variant !== this
                    ? variant.Qualifiers
                    : []
                )
              )
          );
        }

        /**
         * Returns underlying value encoded according to the specification.
         */
        toEncodedString() {
          return this.value.toEncodedString();
        }

        static fromQualifiedString(value) {
          if (!this.Class) {
            for (const Variant of this.Variants) {
              if (Variant.Class.isQualifiedString(value)) {
                return maybeFrom(Variant, value);
              }
            }
          } else {
            return new this(maybeFrom(this.Class, value));
          }

          throw new Error(
            `Unsupported qualified string: \`${value}\`, expected with either prefix: ${fmtIter(
              this.Qualifiers
            )}`
          );
        }

        static isQualifiedString(str) {
          for (const variant of this.Variants) {
            if (variant.Class.isQualifiedString(str)) {
              return true;
            }
          }

          return false;
        }

        static fromUnqualifiedString(str) {
          if (this.Class == null) {
            throw new Error(
              `Can't build an instance of \`${this.name}\` from unqualified string: ${str}`
            );
          } else {
            return new this(this.Class.fromUnqualifiedString(str));
          }
        }

        /**
         * Returns fully qualified `did:dock:*` encoded in SS58 or `did:key:*` encoded in BS58.
         */
        toQualifiedEncodedString() {
          return this.value.toQualifiedEncodedString();
        }

        toQualifiedString() {
          return this.value.toQualifiedString();
        }

        toString() {
          return this.value.toString();
        }
      },
    };

    return withFrom(classes[name], function (value, from) {
      if (typeof value === "string" || value instanceof TypedString) {
        if (this.Class != null) {
          return new this(maybeFrom(this.Class, String(value)));
        } else {
          return this.fromQualifiedString(String(value));
        }
      } else if (
        value?.constructor?.Qualifier != null &&
        !this.Qualifiers.find((qualifier) =>
          value.constructor.Qualifier.startsWith(qualifier)
        )
      ) {
        throw new Error(
          `Value has a different qualifier: \`${
            value.constructor.Qualifier
          }\` while expected one of \`${fmtIter(this.Qualifiers)}\` by \`${
            this.name
          }\``
        );
      } else {
        return from(value);
      }
    });
  } else {
    const classes = {
      [name]: class extends klass {
        static Qualifier;

        static isQualifiedString(str) {
          return typeof str === "string" && str.startsWith(this.Qualifier);
        }

        /**
         * Instantiates `DockDid` from a fully qualified did string.
         * @param {string} did - fully qualified `did:dock:*` string
         * @returns {DockDid}
         */
        static fromQualifiedString(str) {
          if (this.isQualifiedString(str)) {
            return this.fromUnqualifiedString(str.slice(this.Qualifier.length));
          } else {
            throw new Error(`Invalid identifier provided: \`${str}\``);
          }
        }

        /**
         * Instantiates `DockDid` from an unqualified did string.
         * @param {string} did - SS58-encoded or hex did.
         * @returns {DockDid}
         */
        static fromUnqualifiedString(str) {
          throw new Error("Unimplemented");
        }

        /**
         * Returns unqualified DID encoded as a `SS58` address.
         */
        toEncodedString() {
          throw new Error("Unimplemented");
        }

        /**
         * Returns fully-qualified encoded string.
         */
        toQualifiedEncodedString() {
          return `${this.constructor.Qualifier}${this.toEncodedString()}`;
        }

        toQualifiedString() {
          if (this instanceof TypedBytes) {
            return `${this.constructor.Qualifier}${this.value}`;
          } else {
            return this.toQualifiedEncodedString();
          }
        }

        toString() {
          return this.toQualifiedEncodedString();
        }
      },
    };

    return withFrom(
      withExtendedPrototypeProperties(
        ["toEncodedString"],
        withExtendedStaticProperties(
          ["Qualifier", "fromUnqualifiedString"],
          classes[name]
        )
      ),
      function (value, from) {
        if (typeof value === "string" || value instanceof TypedString) {
          if (this.isQualifiedString(String(value))) {
            return this.fromQualifiedString(String(value));
          } else {
            return this.fromUnqualifiedString(String(value));
          }
        } else if (
          value?.constructor?.Qualifier != null &&
          !value.constructor.Qualifier.startsWith(this.Qualifier)
        ) {
          throw new Error(
            `Value has a different qualifier: \`${value.constructor.Qualifier}\` while expected \`${this.Qualifier}\` by \`${this.name}\``
          );
        } else {
          return from(value);
        }
      }
    );
  }
}
