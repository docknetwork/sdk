import { getHexIdentifierFromDID } from '../did';
import Policy from './policy';

// Revocation policy that allows one of the pre-decided controllers to update the registry.
export default class OneOfPolicy extends Policy {
  constructor(controllers) {
    super();
    if (controllers === undefined) {
      this.controllers = new Set();
    } else {
      this.controllers = controllers;
    }
  }

  /**
   * Add a owner to the policy
   * @param ownerDID
   */
  addOwner(ownerDID) {
    this.controllers.add(ownerDID);
  }

  /**
   * Converts policy to JSON object
   * @returns {object}
   */
  toJSON() {
    return {
      // Convert each onwer DID to hex identifier if not already
      OneOf: new Set([...this.controllers].map(getHexIdentifierFromDID)),
    };
  }
}
