import withFrom from './with-from';
import { decodeFromBase64, encodeAsBase64 } from '../../utils/base-x';

export default function withBase64(klass) {
  const name = `withBase64(${klass.name})`;
  const obj = {
    [name]: class extends klass {
      toString() {
        return this.toBase64();
      }

      toJSON() {
        return String(this);
      }

      static fromBase64(str) {
        return this.from(decodeFromBase64(str));
      }

      toBase64() {
        return encodeAsBase64(this.bytes);
      }
    },
  };

  return withFrom(obj[name], function from(value, fromFn) { return typeof value === 'string' ? this.fromBase64(value) : fromFn(value); });
}
