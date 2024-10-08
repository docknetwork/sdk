/**
 * Wraps supplied klass into a class that catches `null`ish values in `from`/`fromJSON`/`fromApi` methods.
 * @template C
 * @param {C} klass
 * @returns {C}
 */
export default function withCatchNull(klass) {
  const name = `withCatchNull(${klass.name})`;

  const obj = {
    [name]: class extends klass {
      static from(value) {
        if (value == null) {
          throw new Error(
            `Unexpected \`null\`ish value received by \`${this.name}\``,
          );
        } else {
          return super.from(value);
        }
      }

      static fromJSON(value) {
        if (value == null) {
          throw new Error(
            `Unexpected \`null\`ish value received by \`${this.name}\``,
          );
        } else {
          return super.fromJSON(value);
        }
      }

      static fromApi(value) {
        if (value == null) {
          throw new Error(
            `Unexpected \`null\`ish value received by \`${this.name}\``,
          );
        } else {
          return super.fromApi(value);
        }
      }
    },
  };

  return obj[name];
}
