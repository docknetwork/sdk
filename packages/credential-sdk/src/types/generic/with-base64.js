import withFrom from './with-from';
import {
  decodeFromBase64, encodeAsBase64, isEqualToOrPrototypeOf, u8aToString, stringToU8a, maybeToJSONString,
} from '../../utils';
import TypedEnum from './typed-enum';

export default function withBase64(klass) {
  const name = `withBase64(${klass.name})`;
  let res;

  if (!isEqualToOrPrototypeOf(TypedEnum, klass)) {
    const obj = {
      [name]: class extends klass {
        toString() {
          return this.toBase64();
        }

        static fromBase64(str) {
          return this.from(decodeFromBase64(str));
        }

        toBase64() {
          return encodeAsBase64(this.bytes);
        }
      },
    };

    res = obj[name];
  } else {
    const obj = {
      [name]: class extends klass {
        static Class = klass.Class;

        static Variants = !klass.Class ? klass.Variants?.map(withBase64) : klass.Variants;

        toString() {
          return this.toBase64();
        }

        static fromBase64(str) {
          return this.fromJSON(JSON.parse(u8aToString(decodeFromBase64(str))));
        }

        toBase64() {
          return encodeAsBase64(this.bytes);
        }

        get bytes() {
          return stringToU8a(maybeToJSONString(this));
        }
      },
    };

    res = obj[name];
  }

  return withFrom(res, function from(value, fromFn) { return (typeof value === 'string' ? this.fromBase64(value) : fromFn(value)); });
}
