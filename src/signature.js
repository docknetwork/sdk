import {u8aToHex} from '@polkadot/util';

import {isHexWithGivenByteSize} from './utils/codec';

/** Class representing a Signature. This export class should always be extended (abstract export class in some languages) */
export class Signature {
  /**
   * Creates a new DidSignature object. Validates the given value. Currently supported signature
   * types only require validating the byte size.
   * @param {string} value - Value of the signature. This is validated
   * @return {Signature} The Signature object if the given value is valid.
   */
  fromHex(value, expectedByteSize) {
    this.validateByteSize(value, expectedByteSize);
    const sig = Object.create(this.prototype);
    sig.value = value;
  }

  /**
   * Check that the given signature has the expected byte size. Assumes the signature is in hex.
   */
  validateByteSize(value, expectedByteSize) {
    if (!isHexWithGivenByteSize(value, expectedByteSize)) {
      throw new Error(`Signature must be ${expectedByteSize} bytes`);
    }
  }

  /**
   * Signs the given message and wraps it in the Signature
   * @param {array} message - The message to sign as bytearray
   * @param {KeyringPair} signingPair -The pair from Polkadot-js containing the signing key
   * @returns {Signature}
   */
  fromPolkadotJSKeyringPair(message, signingPair) {
    this.value = u8aToHex(signingPair.sign(message));
  }
  /**
   * @return {Object} The correct DidSignature JSON variant. The extending export class should implement it.
   */
  toJSON() {
    throw new Error('Not implemented. The extending export class should implement it');
  }
}

/** Class representing a Sr25519 Signature */
export class SignatureSr25519 extends Signature {
  /**
   * Generate a Sr25519 signature using Polkadot-js
   * @param {array} message - The message to sign as bytearray
   * @param {KeyringPair} signingPair -The pair from Polkadot-js containing the signing key
   */
  constructor(message, signingPair) {
    super().fromPolkadotJSKeyringPair(message, signingPair);
  }

  /**
   * Create SignatureSr25519 from given hex string
   * @param {string} value - Hex string
   * @returns {Signature}
   */
  fromHex(value) {
    return super.fromHex(value, 64);
  }

  /**
   * @return {Object} The DidSignature JSON variant Sr25519.
   */
  toJSON() {
    return {
      Sr25519: this.value,
    };
  }
}

/** Class representing a Ed25519 Signature */
export class SignatureEd25519 extends Signature {
  /**
   * Generate a Ed25519 signature using Polkadot-js
   * @param {array} message - The message to sign as bytearray
   * @param {KeyringPair} signingPair -The pair from Polkadot-js containing the signing key
   */
  constructor(message, signingPair) {
    super().fromPolkadotJSKeyringPair(message, signingPair);
  }

  /**
   * Create SignatureEd25519 from given hex string
   * @param {string} value - Hex string
   * @returns {Signature}
   */
  fromHex(value) {
    return super.fromHex(value, 64);
  }

  /**
   * @return {Object} The DidSignature JSON variant Ed25519.
   */
  toJSON() {
    return {
      Ed25519: this.value,
    };
  }
}

/** Class representing a Secp256k1 Signature */
export class SignatureSecp256k1 extends Signature {
  /**
   * Generate an Ecdsa signature over Secp256k1 curve using elliptic library
   * @param {array} message - The message to sign as bytearray
   * @param {KeyringPair} signingPair -The pair from elliptic containing the signing key
   */
  constructor(message, signingPair) {
    super();
    // Generate the signature
    const sig = signingPair.sign(message, { canonical: true });

    // The signature is recoverable in 65-byte { R | S | index } format
    const r = sig.r.toString('hex', 32);
    const s = sig.s.toString('hex', 32);
    const i = sig.recoveryParam.toString(16).padStart(2, '0');
    // Make it proper hex
    this.value = '0x' + r + s + i;
  }

  /**
   * Create SignatureSecp256k1 from given hex string
   * @param {string} value - Hex string
   * @returns {Signature}
   */
  fromHex(value) {
    return super.fromHex(value, 65);
  }

  /**
   * @return {Object} The DidSignature JSON variant Secp256k1.
   */
  toJSON() {
    return {
      Secp256k1: this.value,
    };
  }
}
