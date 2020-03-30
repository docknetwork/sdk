/** Class to sign and verify Verifiable Credentials */

import documentLoader from './vc-helpers/document-loader';
import {issue, verifyCredential} from 'vc-js';
import {Ed25519KeyPair, suites} from 'jsonld-signatures';
const {Ed25519Signature2018, JwsLinkedDataSignature} = suites;




// START HACK TO GET VC CODE WORKING WITH TESTS, COPIED FROM ecdsa-secp256k1-signature-2019 and secp256k1-key-pair PACKAGES
// TEMPORARY
import crypto from 'crypto';
import forge from 'node-forge';
const {util: {binary: {base58}}} = forge;
import elliptic from 'elliptic';
const ec = (elliptic).ec('secp256k1');
import util from 'secp256k1-key-pair/lib/util';

class Secp256k1KeyPair {
  /**
   * @param {KeyPairOptions} options - The options to use.
   * @param {string} options.id - The key ID.
   * @param {string} options.controller - The key controller.
   * @param {string} options.publicKeyBase58 - The Base58 encoded Public Key.
   * @param {string} options.privateKeyBase58 - The Base58 Private Key.
   */
  constructor(options = {}) {
    this.id = options.id;
    this.controller = options.controller;
    this.type = 'EcdsaSecp256k1VerificationKey2019';
    this.privateKeyBase58 = options.privateKeyBase58;
    this.publicKeyBase58 = options.publicKeyBase58;
  }

  /**
   * Returns the Base58 encoded public key.
   *
   * @returns {string} The Base58 encoded public key.
   */
  get publicKey() {
    return this.publicKeyBase58;
  }

  /**
   * Returns the Base58 encoded private key.
   *
   * @returns {string} The Base58 encoded private key.
   */
  get privateKey() {
    return this.privateKeyBase58;
  }

  /**
   * Generates a KeyPair with an optional deterministic seed.
   * @param {KeyPairOptions} [options={}] - The options to use.
   *
   * @returns {Promise<Secp256k1KeyPair>} Generates a key pair.
   */
  static async generate(options = {}) {
    const key = ec.genKeyPair();
    const pubPoint = key.getPublic();
    // encode public X and Y in compressed form
    const publicKeyBase58 = base58.encode(new Uint8Array(
      pubPoint.encodeCompressed()));
    const privateKeyBase58 = base58.encode(new Uint8Array(
      key.getPrivate().toArray()));
    return new Secp256k1KeyPair({
      privateKeyBase58,
      publicKeyBase58,
      ...options
    });
  }

  /**
   * Returns a signer object for use with jsonld-signatures.
   *
   * @returns {{sign: Function}} A signer for the json-ld block.
   */
  signer() {
    return secp256SignerFactory(this);
  }

  /**
   * Returns a verifier object for use with jsonld-signatures.
   *
   * @returns {{verify: Function}} Used to verify jsonld-signatures.
   */
  verifier() {
    return secp256VerifierFactory(this);
  }

  /**
   * Adds a public key base to a public key node.
   *
   * @param {Object} publicKeyNode - The public key node in a jsonld-signature.
   * @param {string} publicKeyNode.publicKeyBase58 - Base58 Public Key for
   *   jsonld-signatures.
   *
   * @returns {Object} A PublicKeyNode in a block.
   */
  addEncodedPublicKey(publicKeyNode) {
    publicKeyNode.publicKeyBase58 = this.publicKeyBase58;
    return publicKeyNode;
  }

  /**
   * Generates and returns a public key fingerprint.
   *
   * @param {string} publicKeyBase58 - The base58 encoded public key material.
   *
   * @returns {string} The fingerprint.
   */
  static fingerprintFromPublicKey({publicKeyBase58}) {
    const pubkeyBytes = util.base58Decode({
      decode: base58.decode,
      keyMaterial: publicKeyBase58,
      type: 'public'
    });
    const buffer = new Uint8Array(2 + pubkeyBytes.length);
    // See https://github.com/multiformats/multicodec/blob/master/table.csv
    // 0xe7 is Secp256k1 public key
    buffer[0] = 0xe7; //
    buffer[1] = 0x01;
    buffer.set(pubkeyBytes, 2);
    // prefix with `z` to indicate multi-base base58btc encoding
    return `z${base58.encode(buffer)}`;
  }

  /**
   * Generates and returns a public key fingerprint.
   *
   * @returns {string} The fingerprint.
   */
  fingerprint() {
    const {publicKeyBase58} = this;
    return Secp256k1KeyPair.fingerprintFromPublicKey({publicKeyBase58});
  }

  /**
   * Tests whether the fingerprint was generated from a given key pair.
   *
   * @param {string} fingerprint - A Base58 public key.
   *
   * @returns {Object} An object indicating valid is true or false.
   */
  verifyFingerprint(fingerprint) {
    // fingerprint should have `z` prefix indicating
    // that it's multi-base encoded
    if(!(typeof fingerprint === 'string' && fingerprint[0] === 'z')) {
      return {
        error: new Error('`fingerprint` must be a multibase encoded string.'),
        valid: false
      };
    }
    let fingerprintBuffer;
    try {
      fingerprintBuffer = util.base58Decode({
        decode: base58.decode,
        keyMaterial: fingerprint.slice(1),
        type: 'fingerprint\'s'
      });
    } catch(e) {
      return {error: e, valid: false};
    }
    let publicKeyBuffer;
    try {
      publicKeyBuffer = util.base58Decode({
        decode: base58.decode,
        keyMaterial: this.publicKeyBase58,
        type: 'public'
      });
    } catch(e) {
      return {error: e, valid: false};
    }

    // validate the first two multicodec bytes 0xe701
    const valid = fingerprintBuffer.slice(0, 2).toString('hex') === 'e701' &&
      publicKeyBuffer.equals(fingerprintBuffer.slice(2));
    if(!valid) {
      return {
        error: new Error('The fingerprint does not match the public key.'),
        valid: false
      };
    }
    return {valid};
  }

  static async from(options) {
    return new Secp256k1KeyPair(options);
  }

  /**
   * Contains the public key for the KeyPair
   * and other information that json-ld Signatures can use to form a proof.
   * @param {Object} [options={}] - Needs either a controller or owner.
   * @param {string} [options.controller=this.controller]  - DID of the
   * person/entity controlling this key pair.
   *
   * @returns {Object} A public node with
   * information used in verification methods by signatures.
   */
  publicNode({controller = this.controller} = {}) {
    const publicNode = {
      id: this.id,
      type: this.type,
    };
    if(controller) {
      publicNode.controller = controller;
    }
    this.addEncodedPublicKey(publicNode); // Subclass-specific
    return publicNode;
  }
}

/**
 * @ignore
 * Returns an object with an async sign function.
 * The sign function is bound to the KeyPair
 * and then returned by the KeyPair's signer method.
 * @param {Secp256k1KeyPair} key - An Secp256k1KeyPair.
 *
 * @returns {{sign: Function}} An object with an async function sign
 * using the private key passed in.
 */
function secp256SignerFactory(key) {
  if(!key.privateKeyBase58) {
    return {
      async sign() {
        throw new Error('No private key to sign with.');
      }
    };
  }

  const privateKey = util.base58Decode({
    decode: base58.decode,
    keyMaterial: key.privateKeyBase58,
    type: 'private'
  });
  const k = ec.keyPair({
    priv: privateKey.toString('hex'),
    privEnc: 'hex'
  });
  return {
    async sign({data}) {
      const md = crypto.createHash('sha256').update(data).digest();
      return new Uint8Array(k.sign(md).toDER());
    }
  };
}

/**
 * @ignore
 * Returns an object with an async verify function.
 * The verify function is bound to the KeyPair
 * and then returned by the KeyPair's verifier method.
 * @param {Secp256k1KeyPair} key - An Secp256k1KeyPair.
 *
 * @returns {{verify: Function}} An async verifier specific
 * to the key passed in.
 */
function secp256VerifierFactory(key) {
  const publicKey = util.base58Decode({
    decode: base58.decode,
    keyMaterial: key.publicKeyBase58,
    type: 'public'
  });
  const k = ec.keyPair({
    pub: publicKey.toString('hex'),
    pubEnc: 'hex'
  });
  return {
    async verify({data, signature}) {
      const md = crypto.createHash('sha256').update(data).digest();
      let verified = false;
      try {
        verified = k.verify(md, signature);
      } catch(e) {
        console.error('An error occurred when verifying signature: ', e);
      }
      return verified;
    }
  };
}

class EcdsaSepc256k1Signature2019 extends JwsLinkedDataSignature {
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

// END PACKAGE HACK

class VerifiableCredential {
  /**
   * Issue a Verifiable credential
   * @param {object} keyDoc - key document containing `id`, `controller`, `type`, `privateKeyBase58` and `publicKeyBase58`
   * @param {object} credential - verifiable credential to be signed.
   * @return {object} The signed credential object.
   */
  async issue (keyDoc, credential) {
    const {controller: issuer, type} = keyDoc;

    let suite;
    switch(type) {
    case 'EcdsaSecp256k1VerificationKey2019':
      suite = new EcdsaSepc256k1Signature2019({key: new Secp256k1KeyPair(keyDoc)});
      break;
    case 'Ed25519VerificationKey2018':
      suite = new Ed25519Signature2018({key: new Ed25519KeyPair(keyDoc)});
      break;
    default:
      throw new Error(`Unknown key type ${type}.`);
    }

    credential.issuer = issuer;
    return await issue({
      credential,
      suite,
      documentLoader
    });
  }

  /**
   * Verify a Verifiable credential
   * @param {object} credential - verifiable credential to be verified.
   * @return {object} verification result.
   */
  async verify (credential) {
    return await verifyCredential({
      credential,
      suite: [new Ed25519Signature2018(), new EcdsaSepc256k1Signature2019()],
      documentLoader: documentLoader
    });
  }
}

export default VerifiableCredential;
