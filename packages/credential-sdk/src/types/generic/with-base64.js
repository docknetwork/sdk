import withFrom from './with-from';
import { decodeFromBase64, encodeAsBase64 } from '../../utils/base-x';

export default function withBase64(klass) {
  const name = `withBase64(${klass.name})`;
  const obj = {
    [name]: class extends klass {
      toString() {
        return encodeAsBase64(this.bytes);
      }

      toJSON() {
        return String(this);
      }
    },
  };

  return withFrom(obj[name], (value, from) => from(typeof value === 'string' ? decodeFromBase64(value) : value));
}
