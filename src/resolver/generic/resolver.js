import { ensureString } from '../../utils/type-helpers';
import { withExtendedStaticProperties } from '../../utils/inheritance';
import { WILDCARD } from './const';

/**
 * @template T
 */
class Resolver {
  /**
   * Returns `true` if an entity with the provided identifier can be resolved using this resolver.
   * @param {string} _id - fully qualified identifier.
   * @returns {boolean}
   */
  supports(id) {
    return (
      typeof id === 'string'
      && (this.constructor.METHOD === WILDCARD
        || this.method(id) === this.constructor.METHOD)
      && (this.constructor.PREFIX === WILDCARD
        || this.prefix(id) === this.constructor.PREFIX)
    );
  }

  /**
   * Resolves an entity with the provided identifier.
   * @param {string} _id - fully qualified identifier.
   * @returns {Promise<T>}
   */
  async resolve(_id) {
    throw new Error('Unimplemented');
  }

  /**
   * Extracts a prefix from the provided identifier.
   *
   * @param {string} id
   * @returns {string}
   */
  prefix(id) {
    ensureString(id);
    const end = id.indexOf(':');

    return id.slice(0, end).trim();
  }

  /**
   * Extracts a method from the provided identifier.
   *
   * @param {string} id
   * @returns {string}
   */
  method(id) {
    ensureString(id);
    const start = id.indexOf(':');
    const end = id.indexOf(':', start + 1);

    return id.slice(start + 1, end).trim();
  }
}

/**
 * Resolves an entity if it's identifier is supported.
 * Each resolver must have static properties `PREFIX` and `METHOD`,
 * then the `supports` method will return `true` if they match the identifier.
 * If the resolver must be used for any `PREFIX`/`METHOD` as default, use the `WILDCARD` symbol.
 *
 * @class
 */
export default withExtendedStaticProperties(['PREFIX', 'METHOD'], Resolver);