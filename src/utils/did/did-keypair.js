import { randomAsHex } from "@polkadot/util-crypto";
import { DockKeyPair } from "../misc";

/**
 * Signing keypair along with the optional key identifier.
 */
export class DidKeypair extends DockKeyPair {
  /**
   * Wraps supplied keypair into a `DidKeypair`.
   *
   * @param {*} keyPair
   * @param {?number} keyId
   */
  constructor(keyPair, keyId = void 0) {
    super(keyPair);
    this.keyId = keyId;
  }

  /**
   * Create a new keypair from a DockAPI object.
   * @param {DockAPI} dockApi
   * @param seed - Generates 32-byte random seed if not provided
   * @param keypairType - Defaults to ed25519.
   * @param meta
   * @param keyId - Defaults to 1
   * @returns {DidKeypair}
   */
  static fromApi(
    dockApi,
    {
      seed = randomAsHex(32),
      keypairType = "ed25519",
      meta = null,
      keyId = 1,
    } = {}
  ) {
    return new DidKeypair(
      dockApi.keyring.addFromUri(seed, meta, keypairType),
      keyId
    );
  }

  /**
   * Generates random `Secp256k1` keypair.
   *
   * @param {?Object} params
   * @property {?number} keyId - optional keypair identifier
   * @returns {this}
   */
  static randomSecp256k1({ keyId = void 0 } = {}) {
    const keypair = super.randomSecp256k1.call(this);
    keypair.keyId = keyId;

    return keypair;
  }
}
