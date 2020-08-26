import { BTreeSet } from '@polkadot/types';

import { getHexIdentifierFromDID } from '../did';
import Policy from './policy';

// Revocation policy that allows one of the pre-decided controllers to update the registry.
export default class OneOfPolicy extends Policy {
  /**
   * Constructs a OneOfPolicy with given controllers
   * @param {any} [controllers] - Controller set
   * @constructor
   */
  constructor(controllers = null) {
    super();
    this.controllers = controllers || new Set();
  }

  /**
   * Add a owner to the policy
   * @param {string} ownerDID - Owner's DID
   */
  addOwner(ownerDID) {
    this.controllers.add(ownerDID);
  }

  /**
   * Converts policy to JSON object
   * @returns {object}
   */
  toJSON() {
    // Convert each owner DID to hex identifier if not already
    const controllerIds = [...this.controllers].map(getHexIdentifierFromDID);

    // Sort the controller ids as the node is expecting sorted ids and keeping ids unsorted is giving a signature
    // verification error. This is a workaround and is needed for now. It maybe fixed later
    controllerIds.sort();

    // Create BtreeSet from controller ids as the node expects it.
    // BTreeSet can be initialed without argument.
    // @ts-ignore
    const controllerSet = new BTreeSet();
    controllerIds.forEach((cnt) => {
      // @ts-ignore
      controllerSet.add(cnt);
    });

    return {
      OneOf: controllerSet,
    };
  }
}
