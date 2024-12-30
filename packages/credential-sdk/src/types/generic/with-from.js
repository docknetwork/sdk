export default function withFrom(klass, from, fromJSON = from, fromApi = from) {
  const name = `withFrom(${klass.name})`;

  if (!from) {
    throw new Error(`No \`from\` function provided for \`${klass.name}\``);
  }

  const obj = {
    [name]: class extends klass {
      static from(value) {
        return from.call(this, value, (v) => super.from(v));
      }

      static fromJSON(value) {
        return fromJSON.call(this, value, (v) => super.fromJSON(v));
      }

      static fromApi(value) {
        return fromApi.call(this, value, (v) => super.fromApi(v));
      }
    },
  };

  return obj[name];
}
