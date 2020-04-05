import Secp256k1KeyPair from 'secp256k1-key-pair';
import {suites} from 'jsonld-signatures';
import {schnorrkelVerify} from '@polkadot/util-crypto/schnorrkel';
import {hexToU8a} from '@polkadot/util';

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

export class Sr25519Signature2020 extends suites.JwsLinkedDataSignature {
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
    keypair, publicKey, verificationMethod
  } = {}) {
    super({
      type: 'Sr25519Signature2020', alg: 'EdDSA', verificationMethod: verificationMethod, signer: Sr25519Signature2020.signerFactory(keypair)});
    this.publicKey = publicKey;
    //this._verificationMethod = verificationMethod;
    this.requiredKeyType = 'Sr25519VerificationKey2020';
  }

  /*get verificationMethod() {
    return this._verificationMethod;
  }

  set verificationMethod(verificationMethod) {
    this._verificationMethod = this._verificationMethod;
  }*/

  static signerFactory(keypair) {
    console.log('called Sr25519Signature2020.signer');
    return {
      async sign({data}) {
        console.log('called Sr25519Signature2020.sign');
        return keypair.sign(data);
      }
    };
  }

  /*signer() {
    console.log('called Sr25519Signature2020.signer');
    return {
      async sign({data}) {
        console.log('called Sr25519Signature2020.sign');
        return this.keypair.sign(data);
      }
    };
  }*/

  verifier() {
    console.log('called Sr25519Signature2020.verifier');
    return {
      async verify({data, signature}) {
        console.log('called Sr25519Signature2020.verify');
        return schnorrkelVerify(data, signature, hexToU8a(this.publicKey.value));
      }
    };
  }
}
