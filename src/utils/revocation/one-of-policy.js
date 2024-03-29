import Policy from './policy';

// Revocation policy that allows one of the pre-decided controllers to update the registry.
export default class OneOfPolicy extends Policy {
  /**
   * Constructs a OneOfPolicy with given controllers
   * @param {any} [controllers] - Controller set
   * @constructor
   */
  constructor(controllers = []) {
    super();
    this.controllers = new Set(controllers);
  }

  /**
   * Add a owner to the policy
   * @param {string} ownerDID - Owner's DID
   */
  addOwner(ownerDID) {
    this.controllers.add(ownerDID);
  }

  /**
   * Returns list containing unique sorted owner DIDs.
   * @returns {DockDidOrDidMethodKey[]}
   */
  controllerIds() {
    const controllerIds = [...this.controllers];
    // Sort the controller ids as the node is expecting sorted ids and keeping ids unsorted is giving a signature
    // verification error. This is a workaround and is needed for now. It maybe fixed later
    controllerIds.sort();

    return controllerIds;
  }

  /**
   * Converts policy to JSON object
   * @returns {object}
   */
  toJSON() {
    return {
      OneOf: this.controllerIds(),
    };
  }
}
