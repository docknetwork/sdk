import documentLoader from './vc/document-loader';
import vcjs from 'vc-js';
import {Ed25519KeyPair, suites} from 'jsonld-signatures';
import Secp256k1KeyPair from 'secp256k1-key-pair';
import {EcdsaSepc256k1Signature2019, Sr25519Signature2020} from './vc/custom_crypto';

const {Ed25519Signature2018} = suites;

//TODO: discuss whether we still want to allow usage of the signing functionality outside of credentials created with
// our VerifiableCredential class.
/**
 * Get signature suite from a keyDoc
 * @param {object} keyDoc - key document containing `id`, `controller`, `type`, `privateKeyBase58` and `publicKeyBase58`
 * @returns {EcdsaSepc256k1Signature2019|Ed25519Signature2018|Sr25519Signature2020} - signature suite.
 */
export function getSuiteFromKeyDoc(keyDoc) {
  switch(keyDoc.type) {
  case 'EcdsaSecp256k1VerificationKey2019':
    return new EcdsaSepc256k1Signature2019({key: new Secp256k1KeyPair(keyDoc)});
  case 'Ed25519VerificationKey2018':
    return new Ed25519Signature2018({key: new Ed25519KeyPair(keyDoc)});
  case 'Sr25519VerificationKey2020':
    return new Sr25519Signature2020({keypair: keyDoc.keypair, publicKey: keyDoc.publicKey, verificationMethod: keyDoc.id});
  default:
    throw new Error(`Unknown key type ${keyDoc.type}.`);
  }
}

/**
 * Issue a Verifiable credential
 * @param {object} keyDoc - key document containing `id`, `controller`, `type`, `privateKeyBase58` and `publicKeyBase58`
 * @param {object} credential - Credential to be signed.
 * @param {Boolean} compactProof - Whether to compact the JSON-LD or not.
 * @return {object} The signed credential object.
 */
export async function issueCredential(keyDoc, credential, compactProof = true) {
  const suite = getSuiteFromKeyDoc(keyDoc);
  // The following code (including `issue` method) will modify the passed credential so clone it.
  const cred = {...credential};
  cred.issuer = keyDoc.controller;
  return await vcjs.issue({
    suite,
    credential: cred,
    documentLoader: documentLoader(),
    compactProof
  });
}

/**
 * Verify a Verifiable Credential. Returns the verification status and error in an object
 * @param {object} credential - verifiable credential to be verified.
 * @param {Resolver} resolver - Resolver for DIDs.
 * @param {Boolean} compactProof - Whether to compact the JSON-LD or not.
 * @return {object} verification result.
 */
export async function verifyCredential(credential, resolver, compactProof = true) {
  return await vcjs.verifyCredential({
    credential,
    suite: [new Ed25519Signature2018(), new EcdsaSepc256k1Signature2019(), new Sr25519Signature2020()],
    documentLoader: documentLoader(resolver),
    compactProof
  });
}

/**
 * Check that credential is verified, i.e. the credential has VCDM compliant structure and the `proof`
 * (signature by issuer) is correct.
 * @param {object} credential - verifiable credential to be verified.
 * @param {Resolver} resolver - Resolver for DIDs.
 * @param {Boolean} compactProof - Whether to compact the JSON-LD or not.
 * @returns {Promise<boolean>} Returns promise that resolves to true if verified
 */
export async function isVerifiedCredential(credential, resolver, compactProof = true) {
  const result = await verifyCredential(credential, resolver, compactProof);
  return result.verified;
}

/**
 * Create an unsigned Verifiable Presentation
 * @param {object|Array<object>} verifiableCredential - verifiable credential (or an array of them) to be bundled as a presentation.
 * @param {string} id - optional verifiable presentation id to use
 * @param {string} holder - optional presentation holder url
 * @return {object} verifiable presentation.
 */
export function createPresentation(verifiableCredential, id, holder) {
  return vcjs.createPresentation({
    verifiableCredential,
    id,
    holder
  });
}

/**
 * Sign a Verifiable Presentation
 * @param {object} presentation - the one to be signed
 * @param {object} keyDoc - key document containing `id`, `controller`, `type`, `privateKeyBase58` and `publicKeyBase58`
 * @param {string} challenge - proof challenge Required.
 * @param {string} domain - proof domain (optional)
 * @param {Resolver} resolver - Resolver for DIDs.
 * @param {Boolean} compactProof - Whether to compact the JSON-LD or not.
 * @return {Promise<{VerifiablePresentation}>} A VerifiablePresentation with a proof.
 */
export async function signPresentation(presentation, keyDoc, challenge, domain, resolver, compactProof = true) {
  // TODO: support other purposes than the default of "authentication"
  const suite = getSuiteFromKeyDoc(keyDoc);
  return await vcjs.signPresentation({
    presentation,
    suite,
    domain,
    challenge,
    compactProof,
    documentLoader: documentLoader(resolver)
  });
}

/**
 * Verify a Verifiable Presentation. Returns the verification status and error in an object
 * @param {object} presentation - verifiable credential to be verified.
 * @param {string} challenge - proof challenge Required.
 * @param {string} domain - proof domain (optional)
 * @param {Resolver} resolver - Resolver to resolve the issuer DID (optional)
 * @param {Boolean} compactProof - Whether to compact the JSON-LD or not.
 * @return {object} verification result.
 */
export async function verifyPresentation(presentation, challenge, domain, resolver, compactProof = true) {
  // TODO: support other purposes than the default of "authentication"
  return await vcjs.verify({
    presentation,
    suite: [new Ed25519Signature2018(), new EcdsaSepc256k1Signature2019(), new Sr25519Signature2020()],
    challenge,
    domain,
    documentLoader: documentLoader(resolver),
    compactProof
  });
}

/**
 * Check that presentation is verified, i.e. the presentation and credentials have VCDM compliant structure and
 * the `proof` (signature by holder) is correct.
 * @param {object} presentation - verifiable credential to be verified.
 * @param {string} challenge - proof challenge Required.
 * @param {string} domain - proof domain (optional)
 * @param {Resolver} resolver - Resolver to resolve the issuer DID (optional)
 * @param {Boolean} compactProof - Whether to compact the JSON-LD or not.
 * @returns {Promise<boolean>}
 */
export async function isVerifiedPresentation(presentation, challenge, domain, resolver, compactProof = true) {
  const result = await verifyPresentation(presentation, challenge, domain, compactProof);
  return result.verified;
}

/**
 * Return true if the given value is a string.
 * @param value
 * @returns {boolean}
 */
export function isString(value) {
  return typeof value === 'string' || value instanceof String;
}

/**
 * Return true if a value is an object
 * @param value
 * @returns {boolean}
 */
export function isObject(value) {
  return value && typeof value === 'object' && value.constructor === Object;
}
