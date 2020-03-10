// TODO: document this file properly

const DockDIDQualifier = "did:dock";
class DIDModule {
  constructor(api) {
    this.api = api;
  }

  /**
   * Creates a new DID
   * @return {string} The extrinsic to sign and send.
   */
  new(did, controller, publicKey) {
    return this.api.tx.didModule.new(did, {
      controller,
      public_key: publicKey
    });
  }

  async get(did) {
    // TODO: Convert DID and pk to base58
    var resp = await this.api.query.didModule.dIDs(did);
    if (!resp) {
      console.error("Got null response");
      return;
    }
    console.log("response", resp);
    var detail = resp[0];
    var lastModifiedBlockNo = resp[1];
    if (lastModifiedBlockNo == 0) {
      console.error("Could not find DID:", did);
    } else {
      // Create the fully qualified DID like "did:dock:..."
      var fullyQualifiedDid = `${DockDIDQualifier}:${did}`;

      // Determine the type of the public key
      var typ, pk_b58;
      if (detail.public_key.isSr25519) {
        typ = "Sr25519VerificationKey2018";
        pk_b58 = detail.public_key.asSr25519;
      } else if (detail.public_key.isEd25519) {
        typ = "Ed25519VerificationKey2018";
        pk_b58 = detail.public_key.asEd25519;
      } else {
        typ = "EcdsaSecp256k1VerificationKey2019";
        pk_b58 = detail.public_key.asSecp256K1;
      }

      // The DID has only one key as of now.
      var didPk = {
        "id": `${fullyQualifiedDid}#keys-1`,
        "type": typ,
        "controller": `${DockDIDQualifier}:${detail.controller}`,
        "publicKeyBase58": pk_b58
      };

      return {
        "@context": ["https://www.w3.org/ns/did/v1"],
        "id": fullyQualifiedDid,
        "publicKey": [
          didPk
        ],
        "authentication": [didPk.id]
      }
    }
  }
}

export default DIDModule;
