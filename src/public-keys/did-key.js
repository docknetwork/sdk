import VerificationRelationship from './verification-relationship';

export default class DidKey {
  /**
   *
   * @param {PublicKey} publicKey
   * @param {VerificationRelationship} verRels
   */
  constructor(publicKey, verRels = undefined) {
    this.publicKey = publicKey;
    this.verRels = verRels !== undefined ? verRels : new VerificationRelationship();
  }

  toJSON() {
    return {
      publicKey: this.publicKey.toJSON(),
      verRels: this.verRels.value,
    };
  }
}
