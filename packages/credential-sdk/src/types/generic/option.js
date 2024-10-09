import { NotAConstructor } from '../../utils';

/**
 * Extends `fromApi`/`fromJSON`/`from` methods of the provided class to check for the `null`'ish (`None`) values.
 * In case `class.from(null)` is called, returns `null` instead of throwing an error.
 *
 * @template C
 * @param {C} klass
 * @returns {C}
 */
/* eslint-disable sonarjs/cognitive-complexity */
export default function option(klass) {
  const name = `Option<${klass.name}>`;

  if (klass[NotAConstructor]) {
    const obj = {
      [name](...args) {
        return klass.apply(this, args);
      },
    };

    obj[name].fromApi = function fromApi(valueOrValueOpt) {
      if (valueOrValueOpt == null || valueOrValueOpt.isNone) {
        return null;
      } else if (valueOrValueOpt.isSome) {
        return klass.fromApi(valueOrValueOpt.unwrap());
      } else {
        return klass.fromApi(valueOrValueOpt);
      }
    };

    obj[name].from = function from(valueOrValueOpt) {
      if (valueOrValueOpt == null) {
        return null;
      } else if (valueOrValueOpt.isSome != null) {
        return this.fromApi(valueOrValueOpt);
      } else {
        return klass.from(valueOrValueOpt);
      }
    };

    obj[name].fromJSON = function fromJSON(valueOrNull) {
      if (valueOrNull == null) {
        return null;
      } else {
        return klass.fromJSON(valueOrNull);
      }
    };

    return obj[name];
  }

  const obj = {
    [name]: class extends klass {
      static fromApi(valueOrValueOpt) {
        if (valueOrValueOpt == null || valueOrValueOpt.isNone) {
          return null;
        } else if (valueOrValueOpt.isSome) {
          return super.fromApi(valueOrValueOpt.unwrap());
        } else {
          return super.fromApi(valueOrValueOpt);
        }
      }

      static from(valueOrValueOpt) {
        if (valueOrValueOpt == null) {
          return null;
        } else if (valueOrValueOpt.isSome != null) {
          return this.fromApi(valueOrValueOpt);
        } else {
          return super.from(valueOrValueOpt);
        }
      }

      static fromJSON(valueOrNull) {
        if (valueOrNull == null) {
          return null;
        } else {
          return super.fromJSON(valueOrNull);
        }
      }
    },
  };

  return obj[name];
}
