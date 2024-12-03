import DockKeypair from './keypair';
import { DidKey } from '../types/did/onchain/did-key';
import VerificationMethodRefOrIdentRef from '../types/did/document/verification-method-ref-or-ident-ref';
import { ensureInstanceOf } from '../utils';
import { DidMethodKey } from '../types/did/onchain/typed-did';

/**
 * A class representation of DID Keypair which includes a signing keypair and its associated verification method reference identifier.
 */
export default class DidKeypair {
  /**
   * Constructs a `DidKeypair` instance from the supplied keypair.
   *
   * @param {VerificationMethodRefOrIdentRef} keyRef - The reference of the verification method.
   * @param {DockKeypair} keyPair - Key pair provided.
   */
  constructor(keyRef, keyPair) {
    const ref = VerificationMethodRefOrIdentRef.from(keyRef);

    ensureInstanceOf(keyPair, DockKeypair);

    this.verificationMethodId = ref;
    this.keyPair = keyPair;
  }

  /**
   * Static function to create a `DidKeypair` instance from the provided keyPair.
   *
   * @param {DockKeypair} keyPair - Key pair provided.
   * @return The new instance of `DidKeypair`.
   */
  static didMethodKey(keyPair) {
    const did = DidMethodKey.fromKeypair(keyPair);

    return new this([did, did.asDidMethodKey.toEncodedString()], keyPair);
  }

  /**
   * Get the public key from the current key pair.
   *
   * @return The public key.
   */
  publicKey() {
    return this.keyPair.publicKey();
  }

  /**
   * Creates a new `DidKey` instance from the public key of the current key pair.
   *
   * @param {?number} verRels - Number indicating verification relationships.
   * @return The new instance of `DidKey`.
   */
  didKey(verRels) {
    return new DidKey(this.keyPair.publicKey(), verRels);
  }

  /**
   * Get the DID from the current verification method ID.
   *
   * @return The DID.
   */
  get did() {
    return this.verificationMethodId[0];
  }

  /**
   * Get the Key ID from the current verification method ID.
   *
   * @return The Key ID.
   */
  get keyId() {
    return this.verificationMethodId[1];
  }

  /**
   * Sign the provided message with the key pair.
   *
   * @param {Uint8Array} message - The message to sign.
   * @return The signature.
   */
  sign(message) {
    return this.keyPair.sign(message);
  }
}
