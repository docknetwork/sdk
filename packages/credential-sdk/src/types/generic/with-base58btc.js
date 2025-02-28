import withFrom from './with-from';
import { decodeFromBase58btc, encodeAsBase58btc } from '../../utils/encoding';
import { withExtendedStaticProperties } from '../../utils/inheritance';

export default function withBase58btc(klass) {
  const name = `withBase58btc(${klass.name})`;
  const obj = {
    [name]: class extends klass {
      // Define the static prefix as a class variable
      static Prefix;

      toString() {
        return this.toBase58btc();
      }

      toJSON() {
        return String(this);
      }

      get value() {
        return this.toBase58btc();
      }

      static fromBase58btc(str) {
        return this.from(decodeFromBase58btc(str));
      }

      toBase58btc() {
        const {
          constructor: { Prefix },
        } = this;

        return encodeAsBase58btc(Prefix, this.bytes);
      }
    },
  };

  return withExtendedStaticProperties(
    ['Prefix'],
    withFrom(obj[name], (value, from) => (typeof value === 'string' ? this.fromBase58btc(value) : from(value))),
  );
}
