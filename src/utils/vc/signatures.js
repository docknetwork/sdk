import Secp256k1KeyPair from 'secp256k1-key-pair';
import {suites} from 'jsonld-signatures';

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
