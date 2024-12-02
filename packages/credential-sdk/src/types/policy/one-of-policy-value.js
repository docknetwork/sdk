import { TypedSet } from '../generic';
import { DockDidOrDidMethodKey } from '../did/onchain/typed-did';

/**
 * Constructs a OneOfPolicy with given controllers
 * @param {Iterable<*>} [controllers] - Controller set
 * @constructor
 */
export default class OneOfPolicyValue extends TypedSet {
  static Type = 'oneOf';

  static Class = DockDidOrDidMethodKey;
}
