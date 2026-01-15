import withFrom from './with-from';
import {
  u8aToString,
} from '../../utils/types';
import { isEqualToOrPrototypeOf } from '../../utils/inheritance';

import TypedEnum from './typed-enum';
import { encodeAsMultibase, decodeFromMultibase } from '../../utils/encoding/multibase';

export default function withMultibase(klass) {
  const name = `withMultibase(${klass.name})`;
  let res;

  if (!isEqualToOrPrototypeOf(TypedEnum, klass)) {
    const obj = {
      [name]: class extends klass {
        toString() {
          return this.toMultibaseBase58();
        }

        toJSON() {
          return String(this);
        }

        get value() {
          return this.toMultibaseBase58();
        }

        static fromMultibaseBase58(str) {
          return this.from(decodeFromMultibase(str));
        }

        toMultibaseBase58() {
          return encodeAsMultibase([], this.bytes);
        }
      },
    };

    res = obj[name];
  } else {
    const obj = {
      [name]: class extends klass {
        static Class = klass.Class;

        static Variants = !klass.Class
          ? klass.Variants?.map(withMultibase)
          : klass.Variants;

        toString() {
          return this.toMultibaseBase58();
        }

        static fromMultibaseBase58(str) {
          return this.fromJSON(JSON.parse(u8aToString(decodeFromMultibase(str))));
        }

        toMultibaseBase58() {
          return encodeAsMultibase([], this.bytes);
        }
      },
    };

    res = obj[name];
  }

  return withFrom(res, function from(value, fromFn) {
    return typeof value === 'string' ? this.fromMultibaseBase58(value) : fromFn(value);
  });
}
