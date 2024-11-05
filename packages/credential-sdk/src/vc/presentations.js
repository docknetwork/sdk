import jsonld from 'jsonld';
import jsigs from 'jsonld-signatures';
import {
  BBSPlusPublicKeyG2,
  BBSPublicKey,
  PSPublicKey,
  Presentation,
  CredentialSchema,
} from '@docknetwork/crypto-wasm-ts';
import b58 from 'bs58';
import { getPrivateStatus, verifyCredential } from './credentials';
/// import DIDResolver from "../resolver/did/did-resolver"; // eslint-disable-line
import { isCredVerGte060 } from './crypto/common/DockCryptoSignature';

import defaultDocumentLoader from './document-loader';
import { getSuiteFromKeyDoc } from './helpers';
import {
  Bls12381BBSSigDockSigName,
  Bls12381PSSigDockSigName,
  Bls12381BBS23SigDockSigName,
  Bls12381BBSDockVerKeyName,
  Bls12381PSDockVerKeyName,
  Bls12381BBS23DockVerKeyName,
  Bls12381BBDT16DockVerKeyName,
  Bls12381BBDT16MacDockName,
} from './crypto/constants';

import { DEFAULT_CONTEXT_V1_URL } from './constants';

import {
  EcdsaSecp256k1Signature2019,
  Ed25519Signature2018,
  Ed25519Signature2020,
  // Sr25519Signature2020,
  JsonWebSignature2020,
  Bls12381BBSSignatureDock2022,
  Bls12381BBSSignatureDock2023,
  Bls12381PSSignatureDock2023,
} from './crypto';

const { AuthenticationProofPurpose } = jsigs.purposes;

/**
 * @typedef {object} VerifiablePresentation Representation of a Verifiable Presentation.
 */

/**
 * @param {object} presentation - An object that could be a presentation.
 * @throws {Error}
 * @private
 */
function checkPresentation(presentation) {
  // Normalize to an array to allow the common case of context being a string
  const context = Array.isArray(presentation['@context'])
    ? presentation['@context']
    : [presentation['@context']];

  // Ensure first context is 'https://www.w3.org/2018/credentials/v1'
  if (context[0] !== DEFAULT_CONTEXT_V1_URL) {
    throw new Error(
      `"${DEFAULT_CONTEXT_V1_URL}" needs to be first in the `
        + 'list of contexts.',
    );
  }

  // Ensure VerifiablePresentation exists in types
  const types = jsonld.getValues(presentation, 'type');
  if (!types.includes('VerifiablePresentation')) {
    throw new Error('"type" must include "VerifiablePresentation".');
  }
}

export async function verifyPresentationCredentials(
  presentation,
  options = {},
) {
  let verified = true;
  let credentialResults = [];

  // Get presentation credentials
  const credentials = jsonld.getValues(presentation, 'verifiableCredential');
  if (credentials.length > 0) {
    // Verify all credentials in list
    credentialResults = await Promise.all(
      credentials.map((credential) => verifyCredential(credential, { ...options })),
    );

    // Assign credentialId property to all credential results
    for (const [i, credentialResult] of credentialResults.entries()) {
      credentialResult.credentialId = credentials[i].id;
    }

    // Check all credentials passed verification
    const allCredentialsVerified = credentialResults.every((r) => r.verified);
    if (!allCredentialsVerified) {
      verified = false;
    }
  }

  return {
    verified,
    credentialResults,
  };
}

/**
 * @typedef {object} VerifiableParams The Options to verify credentials and presentations.
 * @property {string} [challenge] - proof challenge Required.
 * @property {string} [domain] - proof domain (optional)
 * @property {string} [controller] - controller (optional)
 * @property {DIDResolver} [resolver] - Resolver to resolve the issuer DID (optional)
 * @property {Boolean} [unsignedPresentation] - Whether to verify the proof or not
 * @property {Boolean} [compactProof] - Whether to compact the JSON-LD or not.
 * @property {object} [presentationPurpose] - A purpose other than the default AuthenticationProofPurpose
 * @property {object} [documentLoader] - A document loader, can be null and use the default
 */

/**
 * Verify a Verifiable Presentation. Returns the verification status and error in an object
 * @param {object} presentation The verifiable presentation
 * @param {VerifiableParams} options Verify parameters, this object is passed down to jsonld-signatures calls
 * @return {Promise<object>} verification result. The returned object will have a key `verified` which is true if the
 * presentation is valid and all the credentials are valid and not revoked and false otherwise. The `error` will
 * describe the error if any.
 */
export async function verifyPresentation(presentation, options = {}) {
  if (options.documentLoader && options.resolver) {
    throw new Error(
      'Passing resolver and documentLoader results in resolver being ignored, please re-factor.',
    );
  }

  // Ensure presentation is passed
  if (!presentation) {
    throw new TypeError('"presentation" property is required');
  }

  if (isAnoncreds(presentation)) {
    return verifyAnoncreds(presentation, options);
  }

  // Ensure presentation is valid
  checkPresentation(presentation);

  // Extract parameters
  const {
    challenge,
    domain,
    resolver,
    unsignedPresentation = false,
    presentationPurpose,
    controller,
    suite = [],
  } = options;

  // Build verification options
  const verificationOptions = {
    documentLoader: options.documentLoader || defaultDocumentLoader(resolver),
    ...options,
    resolver: null,
    suite: [
      new Ed25519Signature2018(),
      new Ed25519Signature2020(),
      new EcdsaSecp256k1Signature2019(),
      // new Sr25519Signature2020(),
      new JsonWebSignature2020(),
      ...suite,
    ],
  };

  // TODO: verify proof then credentials
  const { verified, credentialResults } = await verifyPresentationCredentials(
    presentation,
    verificationOptions,
  );
  try {
    // Skip proof validation for unsigned
    if (unsignedPresentation) {
      return { verified, results: [presentation], credentialResults };
    }

    // Early out incase credentials arent verified
    if (!verified) {
      return { verified, results: [presentation], credentialResults };
    }

    // Get proof purpose
    if (!presentationPurpose && !challenge) {
      throw new Error(
        'A "challenge" param is required for AuthenticationProofPurpose.',
      );
    }

    // Set purpose and verify
    const purpose = presentationPurpose
      || new AuthenticationProofPurpose({ controller, domain, challenge });
    const presentationResult = await jsigs.verify(presentation, {
      purpose,
      ...verificationOptions,
    });

    // Return results
    return {
      presentationResult,
      credentialResults,
      verified: verified && presentationResult.verified,
      error: presentationResult.error,
    };
  } catch (error) {
    // Error occured when verifying presentation, catch and return error
    return {
      verified: false,
      results: [{ verified: false, error }],
      error,
    };
  }
}

/**
 * Sign a Verifiable Presentation
 * @param {object} presentation - the one to be signed
 * @param {object} keyDoc - key document containing `id`, `controller`, `type`, `privateKeyBase58` and `publicKeyBase58`
 * @param {string} challenge - proof challenge Required.
 * @param {string} domain - proof domain (optional)
 * @param {DIDResolver} [resolver] - Resolver for DIDs.
 * @param {Boolean} [compactProof] - Whether to compact the JSON-LD or not.
 * @param {object} [presentationPurpose] - Optional presentation purpose to override default AuthenticationProofPurpose
 * @return {Promise<VerifiablePresentation>} A VerifiablePresentation with a proof.
 */
export async function signPresentation(
  presentation,
  keyDoc,
  challenge,
  domain,
  resolver = null,
  compactProof = true,
  presentationPurpose = null,
  addSuiteContext = true,
) {
  const suite = await getSuiteFromKeyDoc(keyDoc);
  const purpose = presentationPurpose
    || new AuthenticationProofPurpose({
      domain,
      challenge,
    });

  const documentLoader = defaultDocumentLoader(resolver);
  const signed = await jsigs.sign(presentation, {
    purpose,
    documentLoader,
    domain,
    challenge,
    compactProof,
    suite,
    addSuiteContext,
  });

  // Sometimes jsigs returns proof like [null, { proof }]
  // check for that case here and if there's only 1 proof store object instead
  if (Array.isArray(signed.proof)) {
    const validProofs = signed.proof.filter((p) => !!p);
    if (validProofs.length === 1) {
      signed.proof = validProofs.pop();
    }
  }
  return signed;
}

export function isAnoncreds(presentation) {
  // Since there is no type parameter present we have to guess by checking field types
  // these wont exist in a standard VP
  return (
    typeof presentation.version === 'string'
    && typeof presentation.proof === 'string'
    && typeof presentation.spec !== 'undefined'
    && typeof presentation.spec.credentials !== 'undefined'
  );
}

/**
 * Verify an anoncreds presentation given in JSON format
 * @param presentation - object
 * @param options - Any accumulator public keys, predicate params, etc required to verify the presentation.
 * @returns {Promise<VerifyResult>}
 */
export async function verifyAnoncreds(presentation, options = {}) {
  const documentLoader = options.documentLoader || defaultDocumentLoader(options.resolver);
  const {
    predicateParams,
    accumulatorPublicKeys,
    circomOutputs,
    blindedAttributesCircomOutputs,
  } = options;

  const keyDocuments = await Promise.all(
    presentation.spec.credentials.map((c, idx) => {
      const { proof } = c.revealedAttributes;
      if (!proof) {
        throw new Error(
          `Presentation credential does not reveal its proof for index ${idx}`,
        );
      }

      let sigClass;
      switch (proof.type) {
        case Bls12381BBSSigDockSigName:
          sigClass = Bls12381BBSSignatureDock2022;
          break;
        case Bls12381BBS23SigDockSigName:
          sigClass = Bls12381BBSSignatureDock2023;
          break;
        case Bls12381PSSigDockSigName:
          sigClass = Bls12381PSSignatureDock2023;
          break;
        case Bls12381BBDT16MacDockName:
          return { type: Bls12381BBDT16DockVerKeyName };
        default:
          throw new Error(`Invalid proof type ${proof.type}`);
      }

      return sigClass.getVerificationMethod({ proof, documentLoader });
    }),
  );

  const recreatedPres = Presentation.fromJSON(presentation);
  const pks = new Map();

  keyDocuments.forEach((keyDocument, i) => {
    if (!keyDocument.type) {
      throw new Error(
        `No type provided for key document ${JSON.stringify(keyDocument)}`,
      );
    }

    // Question: Why would keyDocument.type start with `did:`
    const keyType = keyDocument.type.startsWith('did:')
      ? keyDocument.type.slice(4)
      : keyDocument.type;
    let Cls;

    switch (keyType) {
      case Bls12381BBSDockVerKeyName:
        Cls = BBSPlusPublicKeyG2;
        break;
      case Bls12381BBS23DockVerKeyName:
        Cls = BBSPublicKey;
        break;
      case Bls12381PSDockVerKeyName:
        Cls = PSPublicKey;
        break;
      case Bls12381BBDT16DockVerKeyName:
        return;
      default:
        throw new Error(`Invalid key document type: ${keyType}`);
    }

    const pkRaw = b58.decode(keyDocument.publicKeyBase58);
    pks.set(i, new Cls(pkRaw));
  });

  return recreatedPres.verify(
    pks,
    accumulatorPublicKeys,
    predicateParams,
    circomOutputs,
    blindedAttributesCircomOutputs,
  );
}

/**
 * Get the keyed proofs from the given anoncreds presentation. This is supposed to be called by the verifier to
 * get the keyed-proofs and send them for verification to the issuer or the entity having the corresponding secret key
 * @param presentation
 * @returns {Map<number, KeyedProof>}
 */
export function getKeyedProofsFromVerifiedPresentation(presentation) {
  if (!isAnoncreds(presentation)) {
    throw new Error('Only anoncreds presentation supported');
  }
  const presObject = Presentation.fromJSON(presentation);
  return presObject.getKeyedProofs();
}

/**
 * Get JSON-schemas of all credentials in the presentation
 * @param presentation
 * @param full - when set to true, returns the JSON schema of each credential with properties. This might be a fetched schema
 * @returns {*}
 */
export function getJsonSchemasFromPresentation(presentation, full = false) {
  return presentation.spec.credentials.map((cred) => {
    const schema = isCredVerGte060(cred.version)
      ? CredentialSchema.fromJSON(cred.schema)
      : CredentialSchema.fromJSON(JSON.parse(cred.schema));
    return full ? schema.getEmbeddedJsonSchema() : schema.jsonSchema;
  });
}

/**
 * Get status of all credentials from the presentation with revocation type of private status list.
 * @param presentation
 * @returns {Object[]}
 */
export function getPrivateStatuses(presentation) {
  const credentials = jsonld.getValues(presentation, 'verifiableCredential');
  return credentials.map((c) => getPrivateStatus(c));
}
