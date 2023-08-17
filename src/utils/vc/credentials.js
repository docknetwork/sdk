import jsonld from 'jsonld';
import jsigs from 'jsonld-signatures';
import { statusTypeMatches, checkStatus } from '@digitalbazaar/vc-status-list';

import base64url from 'base64url';
import CredentialIssuancePurpose from './CredentialIssuancePurpose';
import defaultDocumentLoader from './document-loader';
import { getAndValidateSchemaIfPresent } from './schema';
import { isRevocationCheckNeeded, checkRevocationStatus } from '../revocation';
import DIDResolver from "../../resolver/did/did-resolver"; // eslint-disable-line

import {
  getSuiteFromKeyDoc,
  expandJSONLD,
  getKeyFromDIDDocument,
} from './helpers';
import { DEFAULT_CONTEXT_V1_URL, credentialContextField } from './constants';
import { ensureValidDatetime } from '../type-helpers';

import {
  EcdsaSepc256k1Signature2019,
  Ed25519Signature2018,
  Sr25519Signature2020,
  Bls12381PSSignatureDock2023,
  Bls12381PSSignatureProofDock2023,
  Bls12381BBSSignatureDock2022,
  Bls12381BBSSignatureProofDock2022,
  Bls12381BBSSignatureDock2023,
  Bls12381BBSSignatureProofDock2023,
  JsonWebSignature2020,
} from './custom_crypto';
import { signJWS } from './jws';

export const VC_ISSUE_TYPE_JSONLD = 'jsonld';
export const VC_ISSUE_TYPE_PROOFVALUE = 'proofValue';
export const VC_ISSUE_TYPE_JWT = 'jwt';
export const VC_ISSUE_TYPE_DEFAULT = VC_ISSUE_TYPE_JSONLD;

/**
 * @param {string|object} obj - Object with ID property or a string
 * @returns {string|undefined} Object's id property or the initial string value
 * @private
 */
function getId(obj) {
  if (!obj) {
    return undefined;
  }
  if (typeof obj === 'string') {
    return obj;
  }
  return obj.id;
}

function dateStringToTimestamp(dateStr) {
  return Math.floor(Date.parse(dateStr) / 1000);
}

export function formatToJWTPayload(keyDoc, cred) {
  const kid = keyDoc.id;
  const credentialIssuer = cred.issuer;
  const subject = cred.credentialSubject.id;
  const { issuanceDate, expirationDate } = cred;

  // NOTE: Expecting validFrom here for future spec support
  const validFrom = cred.validFrom || issuanceDate;

  // References: https://www.w3.org/TR/vc-data-model/#jwt-encoding
  // https://www.rfc-editor.org/rfc/rfc7519#section-4.1.6
  const vcJwtPayload = {
    jti: cred.id,
    sub: subject || '',
    iss: credentialIssuer.id || credentialIssuer,
    iat: dateStringToTimestamp(issuanceDate),
    vc: cred,
  };

  if (validFrom) {
    vcJwtPayload.nbf = dateStringToTimestamp(validFrom);
  }

  if (expirationDate) {
    vcJwtPayload.exp = dateStringToTimestamp(expirationDate);
  }

  const vcJwtHeader = {
    typ: 'JWT',
    kid,
  };

  return [vcJwtHeader, vcJwtPayload];
}

/**
 * @param {object} credential - An object that could be a VerifiableCredential.
 * @throws {Error}
 */
export function checkCredentialJSONLD(credential) {
  // Ensure VerifiableCredential is listed in credential types
  if (!jsonld.getValues(credential, 'type').includes('VerifiableCredential')) {
    throw new Error('"type" must include `VerifiableCredential`.');
  }

  // Ensure issuanceDate cardinality
  if (jsonld.getValues(credential, 'issuanceDate').length > 1) {
    throw new Error('"issuanceDate" property can only have one value.');
  }

  // Ensure issuer cardinality
  if (jsonld.getValues(credential, 'issuer').length > 1) {
    throw new Error('"issuer" property can only have one value.');
  }

  // Ensure evidences are URIs
  jsonld.getValues(credential, 'evidence').forEach((evidence) => {
    const evidenceId = getId(evidence);
    if (evidenceId && !evidenceId.includes(':')) {
      throw new Error(`"evidence" id must be a URL: ${evidence}`);
    }
  });
}

/**
 * @param {object} credential - An object that could be a VerifiableCredential.
 * @throws {Error}
 */
export function checkCredentialRequired(credential) {
  // Ensure first context is DEFAULT_CONTEXT_V1_URL
  if (credential['@context'][0] !== DEFAULT_CONTEXT_V1_URL) {
    throw new Error(
      `"${DEFAULT_CONTEXT_V1_URL}" needs to be first in the contexts array.`,
    );
  }

  // Ensure type property exists
  if (!credential.type) {
    throw new Error('"type" property is required.');
  }

  // Ensure credential has subject
  if (!credential.credentialSubject) {
    throw new Error('"credentialSubject" property is required.');
  }

  // Ensure issuer is valid
  const issuer = getId(credential.issuer);
  if (!issuer) {
    throw new Error(
      `"issuer" must be an object with ID property or a string. Got: ${credential.issuer}`,
    );
  } else if (!issuer.includes(':')) {
    throw new Error('"issuer" id must be in URL format.');
  }

  // Ensure there is an issuance date, if exists
  if (!credential.issuanceDate) {
    throw new Error('"issuanceDate" property is required.');
  } else {
    ensureValidDatetime(credential.issuanceDate);
  }
}

/**
 * @param {object} credential - An object that could be a VerifiableCredential.
 * @throws {Error}
 */
export function checkCredentialOptional(credential) {
  // Ensure credential status is valid, if exists
  if ('credentialStatus' in credential) {
    if (!credential.credentialStatus.id) {
      throw new Error('"credentialStatus" must include an id.');
    }
    if (!credential.credentialStatus.type) {
      throw new Error('"credentialStatus" must include a type.');
    }
  }

  // Ensure expiration date is valid, if exists
  if ('expirationDate' in credential) {
    ensureValidDatetime(credential.expirationDate);
  }
}

/**
 * @param {object} credential - An object that could be a VerifiableCredential.
 * @throws {Error}
 */
export function checkCredential(credential) {
  checkCredentialRequired(credential);
  checkCredentialOptional(credential);
  checkCredentialJSONLD(credential);
}

/**
 * @typedef {object} VerifiableParams The Options to verify credentials and presentations.
 * @property {string} [challenge] - proof challenge Required.
 * @property {string} [domain] - proof domain (optional)
 * @property {string} [controller] - controller (optional)
 * @property {DIDResolver} [resolver] - Resolver to resolve the issuer DID (optional)
 * @property {Boolean} [unsignedPresentation] - Whether to verify the proof or not
 * @property {Boolean} [compactProof] - Whether to compact the JSON-LD or not.
 * @property {Boolean} [forceRevocationCheck] - Whether to force revocation check or not.
 * Warning, setting forceRevocationCheck to false can allow false positives when verifying revocable credentials.
 * @property {object} [purpose] - A purpose other than the default CredentialIssuancePurpose
 * @property {object} [revocationApi] - An object representing a map. "revocation type -> revocation API". The API is used to check
 * revocation status. For now, the object specifies the type as key and the value as the API, but the structure can change
 * as we support more APIs there are more details associated with each API. Only Dock is supported as of now.
 * @property {object} [schemaApi] - An object representing a map. "schema type -> schema API". The API is used to get
 * a schema doc. For now, the object specifies the type as key and the value as the API, but the structure can change
 * as we support more APIs there are more details associated with each API. Only Dock is supported as of now.
 * @property {object} [documentLoader] - A document loader, can be null and use the default
 */

/**
 * Verify a Verifiable Credential. Returns the verification status and error in an object
 * @param {object} [vcJSONorString] The VCDM Credential as JSON-LD or JWT string
 * @param {VerifiableParams} options Verify parameters, this object is passed down to jsonld-signatures calls
 * @return {Promise<object>} verification result. The returned object will have a key `verified` which is true if the
 * credential is valid and not revoked and false otherwise. The `error` will describe the error if any.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export async function verifyCredential(
  vcJSONorString,
  {
    resolver = null,
    compactProof = true,
    forceRevocationCheck = true,
    revocationApi = null,
    schemaApi = null,
    documentLoader = null,
    purpose = null,
    controller = null,
    suite = [],
    verifyDates = true,
  } = {},
) {
  if (documentLoader && resolver) {
    throw new Error(
      'Passing resolver and documentLoader results in resolver being ignored, please re-factor.',
    );
  }

  const isJWT = typeof vcJSONorString === 'string';
  const credential = isJWT
    ? JSON.parse(base64url.decode(vcJSONorString.split('.')[1])).vc
    : vcJSONorString;

  if (!credential) {
    throw new TypeError('A "credential" property is required for verifying.');
  }

  // Set document loader
  const docLoader = documentLoader || defaultDocumentLoader(resolver);

  // Check credential is valid
  checkCredential(credential);

  // Check expiration date
  if (verifyDates && 'expirationDate' in credential) {
    const expirationDate = new Date(credential.expirationDate);
    const currentDate = new Date();
    if (currentDate > expirationDate) {
      const error = new Error('Credential has expired');
      return {
        verified: false,
        error,
        results: [
          {
            verified: false,
            expirationDate,
            error: {
              name: error.name,
              message: error.message,
            },
          },
        ],
      };
    }
  }

  // Expand credential JSON-LD
  const expandedCredential = await expandJSONLD(credential, {
    documentLoader: docLoader,
  });

  // Validate schema
  if (schemaApi) {
    await getAndValidateSchemaIfPresent(
      expandedCredential,
      schemaApi,
      credential[credentialContextField],
      docLoader,
    );
  }

  // JWT formatted credential?
  if (isJWT) {
    const jwtSplit = vcJSONorString.split('.');
    if (jwtSplit.length !== 3) {
      throw new Error('Malformed JWT');
    }

    const header = JSON.parse(base64url.decode(jwtSplit[0]).toString());
    if (!header.kid) {
      throw new Error('No kid in JWT header');
    }

    const { document: didDocument } = await docLoader(header.kid);
    const keyDocument = getKeyFromDIDDocument(didDocument, header.kid);
    const keyDocSuite = await getSuiteFromKeyDoc(keyDocument, false, {
      detached: false,
      header,
    });
    const verified = await keyDocSuite.verifySignature({
      verifyData: new Uint8Array(Buffer.from(jwtSplit[1], 'utf8')),
      verificationMethod: keyDocument,
      proof: {
        jws: vcJSONorString,
      },
    });

    return { verified };
  }

  const fullSuite = [
    new Ed25519Signature2018(),
    new EcdsaSepc256k1Signature2019(),
    new Sr25519Signature2020(),
    new Bls12381BBSSignatureDock2022(),
    new Bls12381BBSSignatureProofDock2022(),
    new Bls12381BBSSignatureDock2023(),
    new Bls12381BBSSignatureProofDock2023(),
    new Bls12381PSSignatureDock2023(),
    new Bls12381PSSignatureProofDock2023(),
    new JsonWebSignature2020(),
    ...suite,
  ];

  // Verify with jsonld-signatures otherwise
  const result = await jsigs.verify(credential, {
    purpose:
      purpose
      || new CredentialIssuancePurpose({
        controller,
      }),
    // TODO: support more key types, see digitalbazaar github
    suite: fullSuite,
    documentLoader: docLoader,
    compactProof,
  });

  // Check for revocation only if the credential is verified and revocation check is needed.
  if (result.verified) {
    const isStatusList2021Credential = statusTypeMatches({ credential });

    if (isStatusList2021Credential) {
      const revResult = await checkStatus({
        credential,
        suite: fullSuite,
        documentLoader: docLoader,
        verifyStatusListCredential: true,
        verifyMatchingIssuers: true,
      });

      // If revocation check fails, return the error else return the result of credential verification to avoid data loss.
      if (!revResult.verified) {
        if (!revResult.error) {
          revResult.error = 'Credential was revoked (or suspended) according to the status list referenced in `credentialStatus`';
        }

        return revResult;
      }
    } else {
      const checkDockRevocation = isRevocationCheckNeeded(
        expandedCredential,
        forceRevocationCheck,
        revocationApi,
      );

      if (checkDockRevocation) {
        const revResult = await checkRevocationStatus(
          expandedCredential,
          revocationApi,
        );

        // If revocation check fails, return the error else return the result of credential verification to avoid data loss.
        if (!revResult.verified) {
          return revResult;
        }
      }
    }
  }

  return result;
}

/**
 * Issue a Verifiable credential
 * @param {object} keyDoc - key document containing `id`, `controller`, `type`, `privateKeyBase58` and `publicKeyBase58`
 * @param {object} credential - Credential to be signed.
 * @param {Boolean} [compactProof] - Whether to compact the JSON-LD or not.
 * @param documentLoader
 * @param purpose
 * @param expansionMap
 * @param {object} [issuerObject] - Optional issuer object to assign
 * @param {Boolean} [addSuiteContext] - Toggles the default
 *   behavior of each signature suite enforcing the presence of its own
 *   `@context` (if it is not present, it's added to the context list).
 * @param {(jsonld|jwt|proofValue)} [type] - Optional format/type of the credential (JSON-LD, JWT, proofValue)
 * @return {Promise<object>} The signed credential object.
 */
export async function issueCredential(
  keyDoc,
  credential,
  compactProof = true,
  documentLoader = null,
  purpose = null,
  expansionMap = null,
  issuerObject = null,
  addSuiteContext = true,
  type = VC_ISSUE_TYPE_DEFAULT,
) {
  const useProofValue = type === VC_ISSUE_TYPE_PROOFVALUE;
  const useJWT = type === VC_ISSUE_TYPE_JWT;

  // Clone the credential object to prevent mutation
  const issuerId = credential.issuer || keyDoc.controller;
  const cred = {
    ...credential,
    issuer: issuerObject
      ? {
        ...issuerObject,
        id: issuerId,
      }
      : issuerId,
  };

  // Ensure credential is valid
  checkCredential(cred);

  // Should use JWT format?
  if (useJWT) {
    // Format to VC JWT spec
    const [vcJwtHeader, vcJwtPayload] = formatToJWTPayload(keyDoc, cred);

    // Get suite from keyDoc parameter
    const jwtOpts = { detached: false, header: vcJwtHeader };
    const suite = await getSuiteFromKeyDoc(keyDoc, false, jwtOpts);
    return signJWS(suite.signer || suite, suite.alg, jwtOpts, vcJwtPayload);
  }

  // Get suite from keyDoc parameter
  const suite = await getSuiteFromKeyDoc(keyDoc, useProofValue);
  if (!suite.verificationMethod) {
    throw new TypeError('"suite.verificationMethod" property is required.');
  }

  // Sign and return the credential with jsonld-signatures otherwise
  return jsigs.sign(cred, {
    purpose: purpose || new CredentialIssuancePurpose(),
    documentLoader: documentLoader || defaultDocumentLoader(),
    suite,
    compactProof,
    expansionMap,
    addSuiteContext,
  });
}
