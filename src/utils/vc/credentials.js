import jsonld from 'jsonld';
import jsigs from 'jsonld-signatures';
import { statusTypeMatches, checkStatus } from '@digitalbazaar/vc-status-list';

import base64url from 'base64url';
import { CredentialBuilder, CredentialSchema } from '@docknetwork/crypto-wasm-ts';
import CredentialIssuancePurpose from './CredentialIssuancePurpose';
import defaultDocumentLoader from './document-loader';
import { getAndValidateSchemaIfPresent } from './schema';
import {
  checkRevocationRegistryStatus, DockRevRegQualifier,
  getCredentialStatus, isAccumulatorRevocationStatus,
  isRegistryRevocationStatus, RevRegType,
} from '../revocation';
import { Resolver } from "../../resolver"; // eslint-disable-line

import {
  getSuiteFromKeyDoc,
  expandJSONLD,
  getKeyFromDIDDocument,
} from './helpers';
import {
  DEFAULT_CONTEXT_V1_URL,
  credentialContextField,
  PrivateStatusList2021EntryType,
  DockStatusList2021Qualifier, StatusList2021EntryType, PrivateStatusList2021Qualifier,
} from './constants';
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
 * @property {Resolver} [resolver] - Resolver to resolve the `DID`s/`StatusList`s/`Blob`s/Revocation registries (optional)
 * @property {boolean} [unsignedPresentation] - Whether to verify the proof or not
 * @property {boolean} [compactProof] - Whether to compact the JSON-LD or not.
 * @property {boolean} [skipRevocationCheck=false] - Disables revocation check.
 * **Warning, setting `skipRevocationCheck` to `true` can allow false positives when verifying revocable credentials.**
 * @property {boolean} [skipSchemaCheck=false] - Disables schema check.
 * **Warning, setting `skipSchemaCheck` to `true` can allow false positives when verifying revocable credentials.**
 * @property {boolean} [verifyMatchingIssuersForRevocation=true] - ensure that status list credential issuer is same as credential issuer.
 * **Will be used only if credential doesn't have `StatusList2021Entry` in `credentialStatus`.**
 * @property {object} [purpose] - A purpose other than the default CredentialIssuancePurpose
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
    skipRevocationCheck = false,
    skipSchemaCheck = false,
    verifyMatchingIssuersForRevocation = true,
    documentLoader = null,
    purpose = null,
    controller = null,
    suite = [],
    verifyDates = true,

    // Anoncreds params
    predicateParams = null,
    accumulatorPublicKeys = null,
    circomOutputs = null,
    blindedAttributesCircomOutputs = null,
  } = {},
) {
  // Set document loader
  const docLoader = getDocLoader(documentLoader, resolver);

  const isJWT = typeof vcJSONorString === 'string';
  const credential = isJWT
    ? JSON.parse(base64url.decode(vcJSONorString.split('.')[1])).vc
    : vcJSONorString;

  if (!credential) {
    throw new TypeError('A "credential" property is required for verifying.');
  }

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

  if (!skipSchemaCheck) {
    await getAndValidateSchemaIfPresent(
      expandedCredential,
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

  // Specify certain parameters for anoncreds
  const anoncredsParams = {
    accumulatorPublicKeys, predicateParams, circomOutputs, blindedAttributesCircomOutputs,
  };
  const fullSuite = [
    new Ed25519Signature2018(),
    new EcdsaSepc256k1Signature2019(),
    new Sr25519Signature2020(),
    new JsonWebSignature2020(),
    new Bls12381BBSSignatureDock2022(anoncredsParams),
    new Bls12381BBSSignatureProofDock2022(anoncredsParams),
    new Bls12381BBSSignatureDock2023(anoncredsParams),
    new Bls12381BBSSignatureProofDock2023(anoncredsParams),
    new Bls12381PSSignatureDock2023(anoncredsParams),
    new Bls12381PSSignatureProofDock2023(anoncredsParams),
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
  if (result.verified && !skipRevocationCheck) {
    const status = getCredentialStatus(expandedCredential);

    if (status) {
      const isStatusList2021Status = statusTypeMatches({ credential });
      if (isStatusList2021Status) {
        const revResult = await checkStatus({
          credential,
          suite: fullSuite,
          documentLoader: docLoader,
          verifyStatusListCredential: true,
          verifyMatchingIssuers: verifyMatchingIssuersForRevocation,
        });

        // If revocation check fails, return the error else return the result of credential verification to avoid data loss.
        if (!revResult.verified) {
          if (!revResult.error) {
            revResult.error = 'Credential was revoked (or suspended) according to the status list referenced in `credentialStatus`';
          }

          return revResult;
        }
      }

      const isRegRevStatus = isRegistryRevocationStatus(status);
      if (isRegRevStatus) {
        const revResult = await checkRevocationRegistryStatus(
          expandedCredential,
          docLoader,
        );

        // If revocation check fails, return the error else return the result of credential verification to avoid data loss.
        if (!revResult.verified) {
          return revResult;
        }
      }

      // Is using private status list or not
      const isPrivStatus = getPrivateStatus(credential) !== undefined;

      // For credentials supporting revocation with accumulator, the revocation check happens using witness which is not
      // part of the credential and evolves over time
      const isAccumStatus = isAccumulatorRevocationStatus(status);

      if (!isStatusList2021Status && !isRegRevStatus && !isPrivStatus && !isAccumStatus) {
        throw new Error(`Unsupported \`credentialStatus\`: \`${status}\``);
      }
    }
  }

  return result;
}

/**
 * Issue a Verifiable credential
 * @param {object} keyDoc - key document containing `id`, `controller`, `type`, `privateKeyBase58` and `publicKeyBase58`
 * @param {object} credential - Credential to be signed.
 * @param {boolean} [compactProof] - Whether to compact the JSON-LD or not.
 * @param documentLoader
 * @param purpose
 * @param expansionMap
 * @param {object} [issuerObject] - Optional issuer object to assign
 * @param {boolean} [addSuiteContext] - Toggles the default
 *   behavior of each signature suite enforcing the presence of its own
 *   `@context` (if it is not present, it's added to the context list).
 * @param {(jsonld|jwt|proofValue)} [type] - Optional format/type of the credential (JSON-LD, JWT, proofValue)
 * @param resolver
 * @return {Promise<object>} The signed credential object.
 */
export async function issueCredential(
  keyDoc,
  credential,
  compactProof = true,
  documentLoader = null,
  purpose = null,
  expansionMap,
  issuerObject = null,
  addSuiteContext = true,
  type = VC_ISSUE_TYPE_DEFAULT,
  resolver = null,
) {
  // Set document loader
  const docLoader = getDocLoader(documentLoader, resolver);

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

  if (suite.requireCredentialSchema) {
    // BBS+, BBS and PS require `cryptoVersion` key to be set. This version wont be overwritten but doesn't matter if it
    // does, we only want to set the key
    cred.cryptoVersion = CredentialBuilder.VERSION;

    // Some suites (such as Dock BBS+) require a schema to exist
    // we intentionally dont set the ID here because it will be auto generated on signing
    if (!cred.credentialSchema) {
      cred.credentialSchema = {
        id: '',
        type: 'JsonSchemaValidator2018',
      };
    }
  }

  // Sign and return the credential with jsonld-signatures otherwise
  return jsigs.sign(cred, {
    purpose: purpose || new CredentialIssuancePurpose(),
    documentLoader: docLoader,
    suite,
    compactProof,
    expansionMap,
    addSuiteContext,
  });
}

/**
 * Get JSON-schema from the credential.
 * @param credential
 * @param full - when set to true, returns the JSON schema with properties. This might be a fetched schema
 * @returns {IEmbeddedJsonSchema | IJsonSchema}
 */
export function getJsonSchemaFromCredential(credential, full = false) {
  if (credential.credentialSchema === undefined) {
    throw new Error('`credentialSchema` key must be defined in the credential');
  }
  if (typeof credential.credentialSchema.id !== 'string') {
    throw new Error(`credentialSchema was expected to be string but was ${typeof credential.credentialSchema}`);
  }
  // eslint-disable-next-line no-nested-ternary
  const key = full ? (credential.credentialSchema.fullJsonSchema !== undefined ? 'fullJsonSchema' : 'id') : 'id';
  return CredentialSchema.convertFromDataUri(credential.credentialSchema[key]);
}

/**
 * Get status of a credential issued with revocation type of private status list.
 * @param credential
 * @returns {*|Object|undefined}
 */
export function getPrivateStatus(credential) {
  return credential.credentialStatus && credential.credentialStatus.type === PrivateStatusList2021EntryType ? credential.credentialStatus : undefined;
}

/**
 * Verify the credential status given the private status list credential
 * @param credentialStatus - `credentialStatus` field of the credential
 * @param privateStatusListCredential
 * @param documentLoader
 * @param suite
 * @param verifyStatusListCredential - Whether to verify the status list credential. This isn't necessary when the caller
 * of this function got the credential directly from the issuer.
 * @param expectedIssuer - Checks whether the issuer of the private status list credential matches the given
 * @returns {Promise<{verified: boolean}>}
 */
export async function verifyPrivateStatus(credentialStatus, privateStatusListCredential, {
  documentLoader = null, suite = [], verifyStatusListCredential = true, expectedIssuer = null,
}) {
  const fullSuite = [
    new Ed25519Signature2018(),
    new EcdsaSepc256k1Signature2019(),
    new Sr25519Signature2020(),
    new JsonWebSignature2020(),
    ...suite,
  ];
  const { statusPurpose: credentialStatusPurpose } = credentialStatus;
  const { statusPurpose: slCredentialStatusPurpose } = privateStatusListCredential.credentialSubject;
  if (slCredentialStatusPurpose !== credentialStatusPurpose) {
    throw new Error(
      `The status purpose "${slCredentialStatusPurpose}" of the status list credential does not match the status purpose "${credentialStatusPurpose}" in the credential.`,
    );
  }

  // ensure that the issuer of the verifiable credential matches
  if (typeof expectedIssuer === 'string') {
    const issuer = typeof privateStatusListCredential.issuer === 'object' ? privateStatusListCredential.issuer.id : privateStatusListCredential.issuer;
    if (issuer !== expectedIssuer) {
      throw new Error(`Expected issuer to be ${expectedIssuer} but found ${issuer}`);
    }
  }

  // verify VC
  if (verifyStatusListCredential) {
    const verifyResult = await verifyCredential(privateStatusListCredential.toJSON(), {
      suite: fullSuite,
      documentLoader,
    });
    if (!verifyResult.verified) {
      throw new Error(`Status list credential failed to verify with error: ${verifyResult.error}`);
    }
  }

  // check VC's SL index for the status
  const { statusListIndex } = credentialStatus;
  const index = parseInt(statusListIndex, 10);
  const list = await privateStatusListCredential.decodedStatusList();
  const verified = !list.getStatus(index);
  return { verified };
}

/**
 * Add revocation registry id to credential
 * @param cred
 * @param regId
 * @returns {*}
 */
export function addRevRegIdToCredential(cred, regId) {
  const newCred = { ...cred };
  newCred.credentialStatus = {
    id: `${DockRevRegQualifier}${regId}`,
    type: RevRegType,
  };
  return newCred;
}

/**
 * For setting revocation type of credential to status list 21
 * @param cred
 * @param statusListCredentialId
 * @param statusListCredentialIndex
 * @param purpose
 * @returns {Object}
 */
export function addStatusList21EntryToCredential(
  cred,
  statusListCredentialId,
  statusListCredentialIndex,
  purpose,
) {
  validateStatusPurpose(purpose);
  return {
    ...cred,
    credentialStatus: {
      id: `${DockStatusList2021Qualifier}${statusListCredentialId}#${statusListCredentialIndex}`,
      type: StatusList2021EntryType,
      statusListIndex: String(statusListCredentialIndex),
      statusListCredential: `${DockStatusList2021Qualifier}${statusListCredentialId}`,
      statusPurpose: purpose,
    },
  };
}

/**
 * For setting revocation type of credential to private status list 21
 * @param cred
 * @param statusListCredentialId
 * @param statusListCredentialIndex
 * @param purpose
 * @returns {Object}
 */
export function addPrivateStatusListEntryToCredential(
  cred,
  statusListCredentialId,
  statusListCredentialIndex,
  purpose,
) {
  validateStatusPurpose(purpose);
  return {
    ...cred,
    credentialStatus: {
      id: `${PrivateStatusList2021Qualifier}${statusListCredentialId}#${statusListCredentialIndex}`,
      type: PrivateStatusList2021EntryType,
      statusListIndex: String(statusListCredentialIndex),
      statusListCredential: `${PrivateStatusList2021Qualifier}${statusListCredentialId}`,
      statusPurpose: purpose,
    },
  };
}

function validateStatusPurpose(purpose) {
  if (purpose !== 'suspension' && purpose !== 'revocation') {
    throw new Error(`statusPurpose must 'suspension' or 'revocation' but was '${purpose}'`);
  }
}

function getDocLoader(documentLoader, resolver) {
  if (documentLoader && resolver) {
    throw new Error(
      'Passing resolver and documentLoader results in resolver being ignored, please re-factor.',
    );
  }
  return documentLoader || defaultDocumentLoader(resolver);
}
