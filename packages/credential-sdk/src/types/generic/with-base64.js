import withFrom from './with-from';
import {
  u8aToString,
  stringToU8a,
} from '../../utils/types';

import {
  decodeFromBase64,
  encodeAsBase64,
} from '../../utils/encoding';

import { maybeToJSONString } from '../../utils/interfaces';
import { isEqualToOrPrototypeOf } from '../../utils/inheritance';
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

        toJSON() {
          return String(this);
        }

        get value() {
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

        static Variants = !klass.Class
          ? klass.Variants?.map(withBase64)
          : klass.Variants;

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

  return withFrom(res, function from(value, fromFn) {
    return typeof value === 'string' ? this.fromBase64(value) : fromFn(value);
  });
}
