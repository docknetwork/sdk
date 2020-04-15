import {suites} from 'jsonld-signatures';
import {schnorrkelVerify} from '@polkadot/util-crypto/schnorrkel';
import {signatureVerify} from '@polkadot/util-crypto/signature';
import { u8aToHex } from '@polkadot/util';
import {ec as EC} from 'elliptic';
import { sha256 } from 'js-sha256';


import b58 from 'bs58';
const secp256k1Curve = new EC('secp256k1');

export const EcdsaSecp256k1VerKeyName = 'EcdsaSecp256k1VerificationKey2019';
const EcdsaSecp256k1SigName = 'EcdsaSecp256k1Signature2019';

export class EcdsaSecp256k1VerificationKey2019 {
  constructor(publicKey) {
    this.publicKey = [...publicKey];
  }

  /**
   * Construct the public key object from the verification method
   * @param verificationMethod
   * @returns {EcdsaSecp256k1VerificationKey2019}
   */
  static from(verificationMethod) {
    if (verificationMethod.type !== EcdsaSecp256k1VerKeyName && !verificationMethod.publicKeyBase58) {
      throw new Error('verification method should have type Sr25519VerificationKey2020 and have the base58 public key');
    }
    return new this(b58.decode(verificationMethod.publicKeyBase58));
  }

  /**
   * Construct the verifier factory that has the verify method using the current public key
   * @returns {Promise<verify>}
   */
  verifier() {
    return EcdsaSecp256k1VerificationKey2019.verifierFactory(this.publicKey);
  }

  /**
   * Verifier factory that returns the object with the verify method
   * @param publicKey
   * @returns {Promise<verify>}
   */
  static verifierFactory(publicKey) {
    return {
      async verify({data, signature}) {
        const hash = sha256.digest(data);
        return secp256k1Curve.verify(hash, signature, publicKey);
      }
    };
  }
}

export class EcdsaSepc256k1Signature2019 extends suites.JwsLinkedDataSignature {
  constructor({
    keypair, verificationMethod
  } = {}) {
    super({
      type: EcdsaSecp256k1SigName, alg: 'ES256K', LDKeyClass: EcdsaSecp256k1VerificationKey2019, verificationMethod: verificationMethod, signer: EcdsaSepc256k1Signature2019.signerFactory(keypair)});
    this.requiredKeyType = EcdsaSecp256k1VerKeyName;
  }

  /**
   * Generate object with `sign` method
   * @param keypair
   * @returns {Promise<sign>}
   */
  static signerFactory(keypair) {
    return {
      async sign({data}) {
        const hash = sha256.digest(data);
        return new Uint8Array(keypair.sign(hash).toDER());
      }
    };
  }
}

export const Ed25519VerKeyName = 'Ed25519VerificationKey2018';
const Ed25519SigName = 'Ed25519Signature2018';

export class Ed25519VerificationKey2018 {
  constructor(publicKey) {
    this.publicKey = [...publicKey];
  }

  /**
   * Construct the public key object from the verification method
   * @param verificationMethod
   * @returns {Ed25519VerificationKey2018}
   */
  static from(verificationMethod) {
    if (verificationMethod.type !== Ed25519VerKeyName && !verificationMethod.publicKeyBase58) {
      throw new Error('verification method should have type Sr25519VerificationKey2020 and have the base58 public key');
    }
    return new this(b58.decode(verificationMethod.publicKeyBase58));
  }

  /**
   * Construct the verifier factory that has the verify method using the current public key
   * @returns {Promise<verify>}
   */
  verifier() {
    return Ed25519VerificationKey2018.verifierFactory(this.publicKey);
  }

  /**
   * Verifier factory that returns the object with the verify method
   * @param publicKey
   * @returns {Promise<verify>}
   */
  static verifierFactory(publicKey) {
    return {
      async verify({data, signature}) {
        const pk = u8aToHex(publicKey);
        return signatureVerify(data, signature, pk).isValid;
      }
    };
  }
}

export class Ed25519Signature2018 extends suites.JwsLinkedDataSignature {
  constructor({
    keypair, verificationMethod
  } = {}) {
    super({
      type: Ed25519SigName, alg: 'EdDSA', LDKeyClass: Ed25519VerificationKey2018, verificationMethod: verificationMethod, signer: Ed25519Signature2018.signerFactory(keypair)});
    this.requiredKeyType = Ed25519VerKeyName;
  }

  /**
   * Generate object with `sign` method
   * @param keypair
   * @returns {Promise<sign>}
   */
  static signerFactory(keypair) {
    return {
      async sign({data}) {
        return keypair.sign(data);
      }
    };
  }
}

export const Sr25519VerKeyName = 'Sr25519VerificationKey2020';
const Sr25519SigName = 'Sr25519Signature2020';

export class Sr25519VerificationKey2020 {
  constructor(publicKey) {
    this.publicKey = [...publicKey];
  }

  /**
   * Construct the public key object from the verification method
   * @param verificationMethod
   * @returns {Sr25519VerificationKey2020}
   */
  static from(verificationMethod) {
    if (verificationMethod.type !== Sr25519VerKeyName && !verificationMethod.publicKeyBase58) {
      throw new Error('verification method should have type Sr25519VerificationKey2020 and have the base58 public key');
    }
    return new this(b58.decode(verificationMethod.publicKeyBase58));
  }

  /**
   * Construct the verifier factory that has the verify method using the current public key
   * @returns {Promise<verify>}
   */
  verifier() {
    return Sr25519VerificationKey2020.verifierFactory(this.publicKey);
  }

  /**
   * Verifier factory that returns the object with the verify method
   * @param publicKey
   * @returns {Promise<verify>}
   */
  static verifierFactory(publicKey) {
    return {
      async verify({data, signature}) {
        return schnorrkelVerify(data, signature, publicKey);
      }
    };
  }
}

export class Sr25519Signature2020 extends suites.JwsLinkedDataSignature {
  constructor({
    keypair, verificationMethod
  } = {}) {
    super({
      type: Sr25519SigName, alg: 'EdDSA', LDKeyClass: Sr25519VerificationKey2020, verificationMethod: verificationMethod, signer: Sr25519Signature2020.signerFactory(keypair)});
    this.requiredKeyType = Sr25519VerKeyName;
  }

  /**
   * Generate object with `sign` method
   * @param keypair
   * @returns {Promise<sign>}
   */
  static signerFactory(keypair) {
    return {
      async sign({data}) {
        return keypair.sign(data);
      }
    };
  }
}
