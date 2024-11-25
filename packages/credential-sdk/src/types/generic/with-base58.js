import withFrom from './with-from';
import { decodeFromBase58, encodeAsBase58 } from '../../utils/base-x';

export default function withBase58(klass) {
  const name = `withBase58(${klass.name})`;
  const obj = {
    [name]: class extends klass {
      toString() {
        return encodeAsBase58(this.bytes);
      }
    },
  };

  return withFrom(obj[name], (value, from) => from(typeof value === 'string' ? decodeFromBase58(value) : value));
}
