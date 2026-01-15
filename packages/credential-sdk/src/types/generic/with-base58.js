import withFrom from './with-from';
import {
  u8aToString,
  stringToU8a,
} from '../../utils/types';

import {
  decodeFromBase58,
  encodeAsBase58,
} from '../../utils/encoding';

import { maybeToJSONString } from '../../utils/interfaces';
import { isEqualToOrPrototypeOf } from '../../utils/inheritance';
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

        get value() {
          return this.toBase58();
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

        static Variants = !klass.Class
          ? klass.Variants?.map(withBase58)
          : klass.Variants;

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

  return withFrom(res, function from(value, fromFn) {
    return typeof value === 'string' ? this.fromBase58(value) : fromFn(value);
  });
}
