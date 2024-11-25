import withFrom from './with-from';
import { decodeFromBase58btc, encodeAsBase58btc } from '../../utils/base-x';
import { withExtendedStaticProperties } from '../../utils/inheritance';

export default function withBase58btc(klass) {
  const name = `withBase58btc(${klass.name})`;
  const obj = {
    [name]: class extends klass {
      // Define the static prefix as a class variable
      static Prefix;

      toString() {
        const {
          constructor: { Prefix },
        } = this;

        return encodeAsBase58btc(Prefix, this.bytes);
      }

      toJSON() {
        return String(this);
      }
    },
  };

  return withExtendedStaticProperties(['Prefix'], withFrom(obj[name], (value, from) => from(typeof value === 'string' ? decodeFromBase58btc(value) : value)));
}
