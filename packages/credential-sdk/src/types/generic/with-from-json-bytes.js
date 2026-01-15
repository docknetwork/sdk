import { u8aToString } from '../../utils/types';

export default function withFromJSONBytes(klass) {
  const name = `withFromJSONBytes(${klass.name})`;

  const obj = {
    [name]: class extends klass {
      static from(value) {
        if (value instanceof Uint8Array) {
          return this.fromJSON(JSON.parse(u8aToString(value)));
        } else {
          return super.from(value);
        }
      }
    },
  };

  return obj[name];
}
