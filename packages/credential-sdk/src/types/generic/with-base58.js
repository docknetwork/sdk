import withFrom from './with-from';
import { decodeFromBase58, encodeAsBase58 } from '../../utils/base-x';

export default function withBase58(klass) {
  const name = `withBase58(${klass.name})`;
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

  return withFrom(obj[name], function from(value, fromFn) { return (typeof value === 'string' ? this.fromBase58(value) : fromFn(value)); });
}
