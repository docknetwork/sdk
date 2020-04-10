import vcjs from 'vc-js';
import {Ed25519KeyPair, suites} from 'jsonld-signatures';
import Secp256k1KeyPair from 'secp256k1-key-pair';
import {EcdsaSepc256k1Signature2019, Sr25519Signature2020} from './vc/custom_crypto';
import { blake2AsHex } from '@polkadot/util-crypto';

import documentLoader from './vc/document-loader';
import {isHexWithGivenByteSize} from './codec';
import {RevEntryByteSize, RevRegIdByteSize} from './revocation';

// XXX: Does it make sense to have a revocation registry type for Dock like below and eliminate the need for `rev_reg:dock:`?
//export const RevRegType = 'DockRevocationRegistry2020';
export const RevRegType = 'CredentialStatusList2017';
export const DockRevRegQualifier = 'rev-reg:dock:';

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
 * @param {object} resolver - Resolver for DIDs.
 * @param {Boolean} compactProof - Whether to compact the JSON-LD or not.
 * @param {Boolean} forceRevocationCheck - Whether to force revocation check or not.
 * Warning, setting forceRevocationCheck to false can allow false positives when verifying revocable credentials.
 * @param {object} revocationAPI - An object representing a map. "revocation type -> revocation API". The API is used to check
 * revocation status. For now, the object specifies the type as key and the value as the API, but the structure can change
 * as we support more APIs there are more details associated with each API. Only Dock is supported as of now.
 * @return {object} verification result. The returned object will have a key `verified` which is true if the
 * credential is valid and not revoked and false otherwise. The `error` will describe the error if any.
 */
export async function verifyCredential(credential, resolver, compactProof = true, forceRevocationCheck = true, revocationAPI) {
  const credVer = await vcjs.verifyCredential({
    credential,
    suite: [new Ed25519Signature2018(), new EcdsaSepc256k1Signature2019(), new Sr25519Signature2020()],
    documentLoader: documentLoader(resolver),
    compactProof
  });

  // Check for revocation only if the credential is verified and revocation check is needed.
  if (credVer.verified && isRevocationCheckNeeded(credential.credentialStatus, forceRevocationCheck, revocationAPI)) {
    const revResult = await checkRevocationStatus(credential, revocationAPI);
    // If revocation check fails, return the error else return the result of credential verification to avoid data loss.
    if (!revResult.verified) {
      return revResult;
    }
  }
  return credVer;
}

/**
 * Check that credential is verified, i.e. the credential has VCDM compliant structure and the `proof`
 * (signature by issuer) is correct.
 * @param {object} credential - verifiable credential to be verified.
 * @param {Resolver} resolver - Resolver for DIDs.
 * @param {Boolean} compactProof - Whether to compact the JSON-LD or not.
 * @param {Boolean} forceRevocationCheck - Whether to force revocation check or not.
 * Warning, setting forceRevocationCheck to false can allow false positives when verifying revocable credentials.
 * @param {object} revocationAPI - An object representing a map. "revocation type -> revocation API". The API is used to check
 * revocation status. For now, the object specifies the type as key and the value as the API, but the structure can change
 * as we support more APIs there are more details associated with each API. Only Dock is supported as of now.
 * @returns {Promise<boolean>} Returns promise that resolves to true if credential is valid and not revoked and false otherwise
 */
export async function isVerifiedCredential(credential, resolver, compactProof = true, forceRevocationCheck = true, revocationAPI) {
  const result = await verifyCredential(credential, resolver, compactProof, forceRevocationCheck, revocationAPI);
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
 * @param {Boolean} forceRevocationCheck - Whether to force revocation check or not.
 * Warning, setting forceRevocationCheck to false can allow false positives when verifying revocable credentials.
 * @param {object} revocationAPI - An object representing a map. "revocation type -> revocation API". The API is used to check
 * revocation status. For now, the object specifies the type as key and the value as the API, but the structure can change
 * as we support more APIs there are more details associated with each API. Only Dock is supported as of now.
 * @return {object} verification result. The returned object will have a key `verified` which is true if the
 * presentation is valid and all the credentials are valid and not revoked and false otherwise. The `error` will
 * describe the error if any.
 */
export async function verifyPresentation(presentation, challenge, domain, resolver, compactProof = true, forceRevocationCheck = true, revocationAPI) {
  // TODO: support other purposes than the default of "authentication"
  const presVer = await vcjs.verify({
    presentation,
    suite: [new Ed25519Signature2018(), new EcdsaSepc256k1Signature2019(), new Sr25519Signature2020()],
    challenge,
    domain,
    documentLoader: documentLoader(resolver),
    compactProof
  });

  if (presVer.verified) {
    for (let credential of presentation.verifiableCredential) {
      // Check for revocation only if the presentation is verified and revocation check is needed.
      if (isRevocationCheckNeeded(credential.credentialStatus, forceRevocationCheck, revocationAPI)) {
        const res = checkRevocationStatus(credential, revocationAPI);
        // Return error for the first credential that does not pass revocation check.
        if (!res.verified) {
          return res;
        }
      }
    }
    // If all credentials pass the revocation check, the let the result of presentation verification be returned.
  }
  return presVer;
}


/**
 * Check that presentation is verified, i.e. the presentation and credentials have VCDM compliant structure and
 * the `proof` (signature by holder) is correct.
 * @param {object} presentation - verifiable credential to be verified.
 * @param {string} challenge - proof challenge Required.
 * @param {string} domain - proof domain (optional)
 * @param {Resolver} resolver - Resolver to resolve the issuer DID (optional)
 * @param {Boolean} compactProof - Whether to compact the JSON-LD or not.
 * @param {Boolean} forceRevocationCheck - Whether to force revocation check or not.
 * Warning, setting forceRevocationCheck to false can allow false positives when verifying revocable credentials.
 * @param {object} revocationAPI - An object representing a map. "revocation type -> revocation API". The API is used to check
 * revocation status. For now, the object specifies the type as key and the value as the API, but the structure can change
 * as we support more APIs there are more details associated with each API. Only Dock is supported as of now.
 * @returns {Promise<boolean>} - Returns promise that resolves to true if the
 * presentation is valid and all the credentials are valid and not revoked and false otherwise. The `error` will
 * describe the error if any.
 */
export async function isVerifiedPresentation(presentation, challenge, domain, resolver, compactProof = true, forceRevocationCheck = true, revocationAPI) {
  const result = await verifyPresentation(presentation, challenge, domain, compactProof, forceRevocationCheck, revocationAPI);
  return result.verified;
}

/**
 * Check if the credential is revoked or not.
 * @param credential
 * @param revocationAPI
 * @returns {Promise<{verified: boolean}|{verified: boolean, error: string}>} The returned object will have a key `verified`
 * which is true if the credential is not revoked and false otherwise. The `error` will describe the error if any.
 */
export async function checkRevocationStatus(credential, revocationAPI) {
  if (!revocationAPI['dock']) {
    throw new Error('Only Dock revocation support is present as of now.');
  } else {
    if (!hasDockRevocation(credential)) {
      return {verified: false, error: 'The credential status does not have the format required by Dock'};
    }
    const dockAPI = revocationAPI['dock'];
    const regId = credential.credentialStatus.id.slice(DockRevRegQualifier.length);
    // Hash credential id to get revocation id
    const revId = getDockRevIdFromCredential(credential);
    const revocationStatus = await dockAPI.revocation.getIsRevoked(regId, revId);
    if (revocationStatus) {
      return {verified: false, error: 'Revocation check failed'};
    } else {
      return {verified: true};
    }
  }
}

/**
 * Generate the revocation id of a credential usable by Dock. It hashes the credential id to get the
 * revocation id
 * @param credential
 * @returns {*}
 */
export function getDockRevIdFromCredential(credential) {
  // The hash outputs the same number of bytes as required by Dock
  return blake2AsHex(credential.id, RevEntryByteSize * 8);
}

/**
 * Check if credential has Dock specific revocation
 * @param credential
 * @returns {Boolean}
 */
export function hasDockRevocation(credential) {
  return credential.credentialStatus &&
    (credential.credentialStatus.type === RevRegType) &&
    credential.credentialStatus.id.startsWith(DockRevRegQualifier) &&
    isHexWithGivenByteSize(credential.credentialStatus.id.slice(DockRevRegQualifier.length), RevRegIdByteSize);
}

/**
 * Checks if the revocation check is needed. Will return true if `forceRevocationCheck` is true else will check the
 * truthyness of revocationAPI. Will return true even if revocationAPI is an empty object.
 * @param {object} credStatus - The `credentialStatus` field in a credential. Does not care about the correct
 * structure of this field but only the truthyness of this field. The intention is to check whether the credential h
 * had a `credentialStatus` field.
 * @param {boolean} forceRevocationCheck - Whether to force the revocation check.
 * Warning, setting forceRevocationCheck to false can allow false positives when verifying revocable credentials.
 * @param {object} revocationAPI - See above verification methods for details on this parameter
 * @returns {boolean} - Whether to check for revocation or not.
 */
export function isRevocationCheckNeeded(credStatus, forceRevocationCheck, revocationAPI) {
  return !!credStatus && (forceRevocationCheck || !!revocationAPI);
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


/**
 * Fail if the given value isn't a string
 * @param value
 */
export function ensureString(value){
  if (!isString(value)){
    throw new Error(`${value} needs to be a string.`);
  }
}

/**
 * Fail if the given value isn't an object
 * @param value
 */
export function ensureObject(value){
  if (!isObject(value)){
    throw new Error(`${value} needs to be an object.`);
  }
}

/**
 * Fail if the given value isn't an object
 * @param value
 * @param {string} name - Name of the object. Used in constructing error.
 */
export function ensureObjectWithId(value, name){
  ensureObject(value);
  if(!value.id){
    throw new Error(`"${name}" must include an id.`);
  }
}
/**
 * Fail if the given datetime isn't valid.
 * @param datetime
 */
export function ensureValidDatetime(datetime){
  if(!vcjs.dateRegex.test(datetime)) {
    throw new Error(`${datetime} needs to be a valid datetime.`);
  }
}


/**
 * Fail if the given string isn't a URL
 * @param url
 */
//TODO: change this to URI
export function ensureURI(url) {
  ensureString(url);
  var pattern = new RegExp('\\w+:(\\/?\\/?)[^\\s]+');
  if (!pattern.test(url)){
    throw new Error(`${url} needs to be a valid URI.`);
  }
}
