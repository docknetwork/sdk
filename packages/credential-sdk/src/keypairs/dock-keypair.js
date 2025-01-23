import {
  withExtendedPrototypeProperties,
  withExtendedStaticProperties,
} from '../utils';
import { randomAsHex } from '../utils/bytes';

/**
 * Abstract keypair used to sign byte sequences of arbitrary size.
 */
class DockKeypair {
  /**
   * Instantiates new `DockKeypair` with the provided underlying keypair.
   *
   * @param {*} keyPair
   */
  constructor(keyPair) {
    this.keyPair = keyPair;
  }

  /**
   * Generates `DockKeypair` from the supplied entropy.
   * @param {Uint8Array} entropy
   * @returns {DockKeypair}
   */
  static fromEntropy(entropy) {
    // eslint-disable-next-line no-underscore-dangle
    return new this(entropy, 'entropy');
  }

  /**
   * Generates `DockKeypair` from the supplied seed.
   * @param {Uint8Array} seed
   * @returns {DockKeypair}
   */
  static fromSeed(seed) {
    // eslint-disable-next-line no-underscore-dangle
    return new this(seed, 'seed');
  }

  /**
   * Generates `DockKeypair` from the supplied private key.
   * @param {Uint8Array} privateKey
   * @returns {DockKeypair}
   */
  static fromPrivateKey(privateKey) {
    // eslint-disable-next-line no-underscore-dangle
    return new this(privateKey, 'private');
  }

  /**
   * Generates random `DockKeypair`.
   * @returns {DockKeypair}
   */
  static random() {
    return new this(randomAsHex(this.SeedSize));
  }

  /**
   * Returns underlying verification key type.
   */
  get verKeyType() {
    return this.constructor.VerKeyType;
  }

  /**
   * Returns underlying public key.
   */
  publicKey() {
    // eslint-disable-next-line no-underscore-dangle
    return new this.constructor.Signature.PublicKey(this._publicKey());
  }

  /**
   * Returns underlying private key.
   */
  privateKey() {
    throw new Error('Unimplemented');
  }

  /**
   * Signs supplied message using underlying keypair.
   * @param {*} message
   */
  sign(message) {
    // eslint-disable-next-line no-underscore-dangle
    return new this.constructor.Signature(this._sign(message));
  }

  /**
   * Returns raw bytes of the underlying public key.
   * @returns {Uint8Array}
   */
  _publicKey() {
    throw new Error('Unimplemented');
  }

  /**
   * Signs supplied message and returns raw signature bytes.
   * @returns {Uint8Array}
   */
  _sign(_message) {
    throw new Error('Unimplemented');
  }

  /**
   * Verifies signature produced over supplied message's using given public key.
   * @param {Uint8Array} _message
   * @param {Uint8Array | Signature} _signature
   * @param {Uint8Array | PublicKey} _publicKey
   * @returns {boolean}
   */
  static verify(_message, _signature, _publicKey) {
    throw new Error('Unimplemented');
  }
}

export default withExtendedPrototypeProperties(
  ['privateKey', '_publicKey', '_sign'],
  withExtendedStaticProperties(
    ['Signature', 'VerKeyType', 'SeedSize', 'verify', 'constructor'],
    DockKeypair,
  ),
);
