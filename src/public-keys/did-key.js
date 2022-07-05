export default class DidKey {
  /**
   *
   * @param {PublicKey} publicKey
   * @param {VerificationRelationship} verRels
   */
  constructor(publicKey, verRels) {
    this.publicKey = publicKey;
    this.verRels = verRels;
  }

  toJSON() {
    return {
      publicKey: this.publicKey.toJSON(),
      verRels: this.verRels.value,
    };
  }
}
