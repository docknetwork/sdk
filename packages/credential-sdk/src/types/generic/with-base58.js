import withFrom from './with-from';
import {
  decodeFromBase58, encodeAsBase58, isEqualToOrPrototypeOf, u8aToString, stringToU8a, maybeToJSONString,
} from '../../utils';
import TypedEnum from './typed-enum';

export default function withBase58(klass) {
  const name = `withBase58(${klass.name})`;
  let res;

  if (!isEqualToOrPrototypeOf(TypedEnum, klass)) {
    const obj = {
      [name]: class extends klass {
        toString() {
          return this.toBase58();
        }

        toJSON() {
          return String(this);
        }

        static fromBase58(str) {
          return this.from(decodeFromBase58(str));
        }

        toBase58() {
          return encodeAsBase58(this.bytes);
        }
      },
    };

    res = obj[name];
  } else {
    const obj = {
      [name]: class extends klass {
        static Class = klass.Class;

        static Variants = !klass.Class ? klass.Variants?.map(withBase58) : klass.Variants;

        toString() {
          return this.toBase58();
        }

        static fromBase58(str) {
          return this.fromJSON(JSON.parse(u8aToString(decodeFromBase58(str))));
        }

        toBase58() {
          return encodeAsBase58(this.bytes);
        }

        get bytes() {
          return stringToU8a(maybeToJSONString(this));
        }
      },
    };

    res = obj[name];
  }

  return withFrom(res, function from(value, fromFn) { return (typeof value === 'string' ? this.fromBase58(value) : fromFn(value)); });
}
