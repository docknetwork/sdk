import Secp256k1KeyPair from 'secp256k1-key-pair';
import {suites} from 'jsonld-signatures';
import {schnorrkelVerify} from '@polkadot/util-crypto/schnorrkel';
import {hexToU8a} from '@polkadot/util';
import b58 from 'bs58';


// TODO: use this package https://github.com/digitalbazaar/ecdsa-secp256k1-signature-2019
// once this PR is merged: https://github.com/digitalbazaar/secp256k1-key-pair/pull/8
export class EcdsaSepc256k1Signature2019 extends suites.JwsLinkedDataSignature {
  /**
   * @param type {string} Provided by subclass.
   *
   * One of these parameters is required to use a suite for signing:
   *
   * @param [creator] {string} A key id URL to the paired public key.
   * @param [verificationMethod] {string} A key id URL to the paired public key.
   *
   * This parameter is required for signing:
   *
   * @param [signer] {function} an optional signer.
   *
   * Advanced optional parameters and overrides:
   *
   * @param [proof] {object} a JSON-LD document with options to use for
   *   the `proof` node (e.g. any other custom fields can be provided here
   *   using a context different from security-v2).
   * @param [date] {string|Date} signing date to use if not passed.
   * @param [key] {LDKeyPair} an optional crypto-ld KeyPair.
   * @param [useNativeCanonize] {boolean} true to use a native canonize
   *   algorithm.
   */
  constructor({
    signer, key, creator, verificationMethod, proof, date, useNativeCanonize
  } = {}) {
    super({
      type: 'EcdsaSecp256k1Signature2019', alg: 'ES256K',
      LDKeyClass: Secp256k1KeyPair, creator, verificationMethod, signer, key,
      proof, date, useNativeCanonize});
    this.requiredKeyType = 'EcdsaSecp256k1VerificationKey2019';
  }
}

const Sr25519VerKeyName = 'Sr25519VerificationKey2020';
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
   * @returns {{verify({data?: *, signature?: *}): Promise<*>}}
   */
  verifier() {
    return Sr25519VerificationKey2020.verifierFactory(this.publicKey);
  }

  /**
   * Verifier factory that returns the object with the verify method
   * @param publicKey
   * @returns {{verify({data?: *, signature?: *}): Promise<*>}|*}
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
  //
  // /**
  //  * Construct verification method object from given proof. Will resolve the key using the DID.
  //  * This is an overridden method.
  //  * @param proof
  //  * @param documentLoader
  //  * @returns {Promise<void>}
  //  */
  // async getVerificationMethod({proof, documentLoader}) {
  //   if (proof.type !== this.type) {
  //     throw new Error(
  //       `Invalid key type. Key type must be "${this.requiredKeyType}".`);
  //   }
  //   const verificationMethod = await super.getVerificationMethod(
  //     {proof, documentLoader});
  //   await this.assertVerificationMethod({verificationMethod});
  //   verificationMethod.type = this.requiredKeyType;
  //   return verificationMethod;
  // }
  //
  // /**
  //  * Check the type of verification method. This is an overridden method.
  //  * @param verificationMethod
  //  * @returns {Promise<void>}
  //  */
  // async assertVerificationMethod({verificationMethod}) {
  //   if((verificationMethod.type !== `sec:${this.requiredKeyType}`) && (verificationMethod.type !== this.requiredKeyType)) {
  //     throw new Error(
  //       `Invalid key type. Key type must be "${this.requiredKeyType}".`);
  //   }
  // }
  //
  // /**
  //  * Create the proof. This is an overridden method.
  //  * @param document
  //  * @param purpose
  //  * @param documentLoader
  //  * @param expansionMap
  //  * @param compactProof
  //  * @returns {Promise<void>}
  //  */
  // async createProof({document, purpose, documentLoader, expansionMap, compactProof}) {
  //   const proof = await super.createProof({document, purpose, documentLoader, expansionMap, compactProof});
  //   //proof['@context'] = 'https://gist.github.com/lovesh/7956e62d9122cfd1658d3dfb3bee4a22/raw';
  //   return proof;
  // }
  //
  // /**
  //  * Check that the proof type is correct. This is an overridden method.
  //  * @param proof
  //  * @returns {Promise<boolean>}
  //  */
  // async matchProof({proof}) {
  //   return (proof.type === this.type) || (proof.type === `sec:${this.type}`);
  // }
  //
  // /**
  //  *Verify that the proof is correct. This is an overridden method.
  //  * @param proof
  //  * @param document
  //  * @param purpose
  //  * @param documentLoader
  //  * @param expansionMap
  //  * @param compactProof
  //  * @returns {Promise<{verified: boolean, error: *}|{verified: boolean}>}
  //  */
  // async verifyProof({
  //   proof, document, purpose, documentLoader, expansionMap,
  //   compactProof}) {
  //   try {
  //     // create data to verify
  //     const verifyData = await this.createVerifyData(
  //       {document, proof, documentLoader, expansionMap, compactProof});
  //
  //     // fetch verification method
  //     const verificationMethod = await this.getVerificationMethod(
  //       {proof, document, documentLoader, expansionMap});
  //
  //     // verify signature on data
  //     const verified = await this.verifySignature({
  //       verifyData, verificationMethod, document, proof,
  //       documentLoader, expansionMap});
  //     if(!verified) {
  //       throw new Error('Invalid signature.');
  //     }
  //
  //     // ensure proof was performed for a valid purpose
  //     const {valid, error} = await purpose.validate(
  //       proof, {document, suite: this, verificationMethod,
  //         documentLoader, expansionMap});
  //
  //     // TODO: Ignoring issuer check for now since since the sr25519 is not a valid security context.
  //     if(!valid && error.message !== 'Credential issuer is required.') {
  //       throw error;
  //     }
  //
  //     return {verified: true};
  //   } catch(error) {
  //     return {verified: false, error};
  //   }
  // }

  /**
   * Generate object with `sign` method
   * @param keypair
   * @returns {{sign({data?: *}): Promise<*>}|*}
   */
  static signerFactory(keypair) {
    return {
      async sign({data}) {
        return keypair.sign(data);
      }
    };
  }

  /**
   * Generate object with `verify` method
   * @param publicKey
   * @returns {{verify({data?: *, signature?: *}): Promise<*>}|*}
   */
  static verifierFactory(publicKey) {
    return {
      async verify({data, signature}) {
        return schnorrkelVerify(data, signature, hexToU8a(publicKey.value));
      }
    };
  }
}
