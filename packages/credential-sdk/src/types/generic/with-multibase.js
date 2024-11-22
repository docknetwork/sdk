import withFrom from './with-from';
import { decodeFromMultibase, encodeAsMultibase } from '../../utils/base-x';
import { withExtendedStaticProperties } from '../../utils/inheritance';

export default function withMultibase(klass) {
  const name = `withMultibase(${klass.name})`;
  const obj = {
    [name]: class extends klass {
      // Define the static prefix as a class variable
      static Prefix;

      get value() {
        return String(this);
      }

      toString() {
        const {
          constructor: { Prefix },
        } = this;

        return encodeAsMultibase(this.bytes, Prefix);
      }
    },
  };

  return withExtendedStaticProperties(['Prefix'], withFrom(obj[name], (value, from) => from(typeof value === 'string' ? decodeFromMultibase(value) : value)));
}
