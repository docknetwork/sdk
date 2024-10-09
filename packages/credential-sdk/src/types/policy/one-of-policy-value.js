import { TypedSet } from '../generic';
import { DockDidOrDidMethodKey } from '../did/onchain/typed-did';

/**
 * Constructs a OneOfPolicy with given controllers
 * @param {any} [controllers] - Controller set
 * @constructor
 */

export default class OneOfPolicyValue extends TypedSet {
  static Type = 'oneOf';

  static Class = DockDidOrDidMethodKey;

  /**
   * Add a owner to the policy
   * @param {string} ownerDID - Owner's DID
   */
  addOwner(ownerDID) {
    this.add(this.constructor.Class.from(ownerDID));
  }
}
