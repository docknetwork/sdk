const cedarPolicies = {
  staticPolicies: `
permit(
  principal,
  action == Credential::Action::"Verify",
  resource
) when {
  principal == context.vpSigner &&
  context.authorizedClaims.creditScore >= 700
};
`,
};
import {
  issueCredential,
  signPresentation,
  verifyPresentation,
  documentLoader as credentialDocumentLoader,
} from '@docknetwork/credential-sdk/vc';
import { MAY_CLAIM_IRI } from '@docknetwork/vc-delegation-engine';
import * as cedar from '@cedar-policy/cedar-wasm/nodejs';

const AUTHORITY_DID = 'did:example:authority';
const DELEGATE_DID = 'did:example:delegator';
const SUBJECT_DID = 'did:example:alice';
const CHALLENGE = 'credit-score-demo';
const DOMAIN = 'delegation.example';

const CREDIT_DELEGATION_CONTEXT = [
  'https://www.w3.org/2018/credentials/v1',
  'https://ld.truvera.io/credentials/delegation',
  {
    '@version': 1.1,
    dock: 'https://rdf.dock.io/alpha/2021#',
    ex: 'https://example.org/credentials#',
    CreditScoreDelegation: 'ex:CreditScoreDelegation',
    body: 'ex:body',
  },
];

const CREDIT_SCORE_CONTEXT = [
  'https://www.w3.org/2018/credentials/v1',
  'https://ld.truvera.io/credentials/delegation',
  {
    '@version': 1.1,
    ex: 'https://example.org/credentials#',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
    CreditScoreCredential: 'ex:CreditScoreCredential',
    creditScore: { '@id': 'ex:creditScore', '@type': 'xsd:integer' },
  },
];

const BASE_JWK_KEY = {
  type: 'JsonWebKey2020',
  publicKeyJwk: {
    kty: 'EC',
    crv: 'P-384',
    x: 'dMtj6RjwQK4G5HP3iwOD94RwbzPhS4wTZHO1luk_0Wz89chqV6uJyb51KaZzK0tk',
    y: 'viPKF7Zbc4FxKegoupyVRcBr8TZHFxUrKQq4huOAyMuhTYJbFpAwMhIrWppql02E',
  },
  privateKeyJwk: {
    kty: 'EC',
    crv: 'P-384',
    x: 'dMtj6RjwQK4G5HP3iwOD94RwbzPhS4wTZHO1luk_0Wz89chqV6uJyb51KaZzK0tk',
    y: 'viPKF7Zbc4FxKegoupyVRcBr8TZHFxUrKQq4huOAyMuhTYJbFpAwMhIrWppql02E',
    d: 'Wq5_KgqjvYh_EGvBDYtSs_0ufJJP0y0tkAXl6GqxHMkY0QP8vmD76mniXD-BWhd_',
  },
};

function buildKeyDoc(controller) {
  return {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/jws-2020/v1',
    ],
    id: `${controller}#controller-key`,
    controller,
    type: BASE_JWK_KEY.type,
    publicKeyJwk: BASE_JWK_KEY.publicKeyJwk,
    privateKeyJwk: BASE_JWK_KEY.privateKeyJwk,
  };
}

const AUTHORITY_KEY = buildKeyDoc(AUTHORITY_DID);
const DELEGATE_KEY = buildKeyDoc(DELEGATE_DID);

const AUTHORITY_DID_DOC = {
  '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/suites/jws-2020/v1'],
  id: AUTHORITY_DID,
  verificationMethod: [
    {
      id: AUTHORITY_KEY.id,
      type: AUTHORITY_KEY.type,
      controller: AUTHORITY_DID,
      publicKeyJwk: AUTHORITY_KEY.publicKeyJwk,
    },
  ],
  assertionMethod: [AUTHORITY_KEY.id],
  authentication: [AUTHORITY_KEY.id],
};

const DELEGATE_DID_DOC = {
  '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/suites/jws-2020/v1'],
  id: DELEGATE_DID,
  verificationMethod: [
    {
      id: DELEGATE_KEY.id,
      type: DELEGATE_KEY.type,
      controller: DELEGATE_DID,
      publicKeyJwk: DELEGATE_KEY.publicKeyJwk,
    },
  ],
  assertionMethod: [DELEGATE_KEY.id],
  authentication: [DELEGATE_KEY.id],
};

const baseLoader = credentialDocumentLoader();
async function exampleDocumentLoader(url) {
  if (url === AUTHORITY_DID) {
    return { contextUrl: null, documentUrl: url, document: AUTHORITY_DID_DOC };
  }
  if (url === DELEGATE_DID) {
    return { contextUrl: null, documentUrl: url, document: DELEGATE_DID_DOC };
  }
  if (url === AUTHORITY_KEY.id) {
    return { contextUrl: null, documentUrl: url, document: AUTHORITY_KEY };
  }
  if (url === DELEGATE_KEY.id) {
    return { contextUrl: null, documentUrl: url, document: DELEGATE_KEY };
  }
  return baseLoader(url);
}

async function main() {
  const rootId = 'urn:cred:deleg-a-b';

  const delegationCredential = await issueCredential(AUTHORITY_KEY, {
    '@context': CREDIT_DELEGATION_CONTEXT,
    id: rootId,
    type: ['VerifiableCredential', 'CreditScoreDelegation', 'DelegationCredential'],
    issuer: AUTHORITY_DID,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: DELEGATE_DID,
      [MAY_CLAIM_IRI]: ['creditScore'],
      body: 'Issuer of Credit Scores',
    },
    rootCredentialId: rootId,
    previousCredentialId: null,
  });

  const creditScoreCredential = await issueCredential(DELEGATE_KEY, {
    '@context': CREDIT_SCORE_CONTEXT,
    id: 'urn:cred:score-alice',
    type: ['VerifiableCredential', 'CreditScoreCredential', 'DelegationCredential'],
    issuer: DELEGATE_DID,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: SUBJECT_DID,
      creditScore: 760,
    },
    rootCredentialId: rootId,
    previousCredentialId: rootId,
  });

  const signedPresentation = await signPresentation(
    {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiablePresentation'],
      holder: DELEGATE_DID,
      verifiableCredential: [delegationCredential, creditScoreCredential],
    },
    DELEGATE_KEY,
    CHALLENGE,
    DOMAIN,
  );

  const verification = await verifyPresentation(signedPresentation, {
    challenge: CHALLENGE,
    domain: DOMAIN,
    failOnUnauthorizedClaims: true,
    documentLoader: exampleDocumentLoader,
    cedarAuth: {
      policies: cedarPolicies,
      cedar,
    },
  });

  console.log('Presentation verified?', verification.verified);
  console.log('Credential verifications:', verification.credentialResults.map((r) => r.verified));

  if (verification.delegationResult) {
    const { decision, summaries, authorizations } = verification.delegationResult;
    console.log('Delegation decision:', decision);
    console.log('Authorized claims derived from chain:', summaries?.[0]?.authorizedClaims);
    if (authorizations?.length) {
      console.log('Cedar authorization decisions:', authorizations);
    }
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Delegation example failed', error);
    process.exit(1);
  });

