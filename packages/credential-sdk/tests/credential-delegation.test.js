import {
  issueCredential,
  signPresentation,
  verifyPresentation,
  documentLoader as credentialDocumentLoader,
} from '../src/vc/index.js';
import { MAY_CLAIM_IRI } from '@docknetwork/vc-delegation-engine';
import * as cedar from '@cedar-policy/cedar-wasm/nodejs';

const AUTHORITY_DID = 'did:example:authority';
const DELEGATE_DID = 'did:example:delegator';
const SECOND_DELEGATE_DID = 'did:example:delegate-2';
const SUBJECT_DID = 'did:example:holder';
const CHALLENGE = 'test-challenge';
const DOMAIN = 'delegation.test';

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

const BASE_JWK = {
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
    type: BASE_JWK.type,
    publicKeyJwk: BASE_JWK.publicKeyJwk,
    privateKeyJwk: BASE_JWK.privateKeyJwk,
  };
}

const AUTHORITY_KEY = buildKeyDoc(AUTHORITY_DID);
const DELEGATE_KEY = buildKeyDoc(DELEGATE_DID);
const SECOND_DELEGATE_KEY = buildKeyDoc(SECOND_DELEGATE_DID);

const DID_DOCS = new Map([
  [
    AUTHORITY_DID,
    {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/jws-2020/v1',
      ],
      id: AUTHORITY_DID,
      verificationMethod: [
        {
          id: AUTHORITY_KEY.id,
          type: AUTHORITY_KEY.type,
          controller: AUTHORITY_DID,
          publicKeyJwk: AUTHORITY_KEY.publicKeyJwk,
        },
      ],
      authentication: [AUTHORITY_KEY.id],
      assertionMethod: [AUTHORITY_KEY.id],
    },
  ],
  [
    DELEGATE_DID,
    {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/jws-2020/v1',
      ],
      id: DELEGATE_DID,
      verificationMethod: [
        {
          id: DELEGATE_KEY.id,
          type: DELEGATE_KEY.type,
          controller: DELEGATE_DID,
          publicKeyJwk: DELEGATE_KEY.publicKeyJwk,
        },
      ],
      authentication: [DELEGATE_KEY.id],
      assertionMethod: [DELEGATE_KEY.id],
    },
  ],
  [
    SECOND_DELEGATE_DID,
    {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/jws-2020/v1',
      ],
      id: SECOND_DELEGATE_DID,
      verificationMethod: [
        {
          id: SECOND_DELEGATE_KEY.id,
          type: SECOND_DELEGATE_KEY.type,
          controller: SECOND_DELEGATE_DID,
          publicKeyJwk: SECOND_DELEGATE_KEY.publicKeyJwk,
        },
      ],
      authentication: [SECOND_DELEGATE_KEY.id],
      assertionMethod: [SECOND_DELEGATE_KEY.id],
    },
  ],
]);

const baseLoader = credentialDocumentLoader();
async function exampleDocumentLoader(url) {
  if (DID_DOCS.has(url)) {
    return {
      contextUrl: null,
      documentUrl: url,
      document: DID_DOCS.get(url),
    };
  }
  const match = Array.from(DID_DOCS.values())
    .flatMap((doc) => doc.verificationMethod ?? [])
    .find((method) => method.id === url);
  if (match) {
    return { contextUrl: null, documentUrl: url, document: match };
  }
  return baseLoader(url);
}

async function buildDelegationChain({ includeSecondDelegation = false }) {
  const rootId = 'urn:cred:deleg-root';
  const delegationCredential = await issueCredential(AUTHORITY_KEY, {
    '@context': CREDIT_DELEGATION_CONTEXT,
    id: rootId,
    type: ['VerifiableCredential', 'CreditScoreDelegation', 'DelegationCredential'],
    issuer: AUTHORITY_DID,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: DELEGATE_DID,
      [MAY_CLAIM_IRI]: ['creditScore', 'body'],
      body: 'Issuer of Credit Scores',
    },
    rootCredentialId: rootId,
    previousCredentialId: null,
  });

  const secondDelegationCredential = includeSecondDelegation
    ? await issueCredential(DELEGATE_KEY, {
      '@context': CREDIT_DELEGATION_CONTEXT,
      id: 'urn:cred:deleg-secondary',
      type: ['VerifiableCredential', 'CreditScoreDelegation', 'DelegationCredential'],
      issuer: DELEGATE_DID,
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: SECOND_DELEGATE_DID,
        [MAY_CLAIM_IRI]: ['creditScore'],
      },
      rootCredentialId: rootId,
      previousCredentialId: rootId,
    })
    : null;

  const creditScoreIssuer = includeSecondDelegation ? SECOND_DELEGATE_KEY : DELEGATE_KEY;
  const creditScoreIssuerDid = includeSecondDelegation ? SECOND_DELEGATE_DID : DELEGATE_DID;
  const creditScoreCredential = await issueCredential(creditScoreIssuer, {
    '@context': CREDIT_SCORE_CONTEXT,
    id: 'urn:cred:score-holder',
    type: ['VerifiableCredential', 'CreditScoreCredential', 'DelegationCredential'],
    issuer: creditScoreIssuerDid,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: SUBJECT_DID,
      creditScore: 780,
    },
    rootCredentialId: rootId,
    previousCredentialId: includeSecondDelegation ? 'urn:cred:deleg-secondary' : rootId,
  });

  const verifiableCredentials = [delegationCredential];
  if (secondDelegationCredential) {
    verifiableCredentials.push(secondDelegationCredential);
  }
  verifiableCredentials.push(creditScoreCredential);
  const holderDid = includeSecondDelegation ? SECOND_DELEGATE_DID : DELEGATE_DID;
  const holderKey = includeSecondDelegation ? SECOND_DELEGATE_KEY : DELEGATE_KEY;
  return {
    verifiableCredentials,
    creditScoreCredential,
    holderDid,
    holderKey,
  };
}

async function issueStandaloneCreditScore({
  id = 'urn:cred:score-only',
  creditScore = 720,
  subjectId = SUBJECT_DID,
} = {}) {
  return issueCredential(DELEGATE_KEY, {
    '@context': CREDIT_SCORE_CONTEXT,
    id,
    type: ['VerifiableCredential', 'CreditScoreCredential'],
    issuer: DELEGATE_DID,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: subjectId,
      creditScore,
    },
  });
}

async function signDelegationPresentation({ verifiableCredential, holder, holderKey }) {
  return signPresentation(
    {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiablePresentation'],
      holder,
      verifiableCredential,
    },
    holderKey,
    CHALLENGE,
    DOMAIN,
  );
}

function includesDelegationType(types = []) {
  return types.some(
    (type) => typeof type === 'string'
      && (type === 'DelegationCredential' || type.endsWith('#DelegationCredential')),
  );
}

function cedarPolicy({ minimumScore = 700 } = {}) {
  return {
    staticPolicies: `
permit(
  principal in Credential::Chain::"Action:Verify",
  action == Credential::Action::"Verify",
  resource in Credential::Chain::"Action:Verify"
) when {
  principal == context.vpSigner &&
  context.authorizedClaims.creditScore >= ${minimumScore}
};`,
  };
}

describe('credential delegation integration', () => {
  it('verifies the delegation example without cedar policy', async () => {
    const {
      verifiableCredentials,
      holderDid,
      holderKey,
    } = await buildDelegationChain({});
    const presentation = await signDelegationPresentation({
      verifiableCredential: verifiableCredentials,
      holder: holderDid,
      holderKey,
    });
    const result = await verifyPresentation(presentation, {
      challenge: CHALLENGE,
      domain: DOMAIN,
      failOnUnauthorizedClaims: true,
      documentLoader: exampleDocumentLoader,
    });
    expect(result.verified).toBe(true);
    expect(result.credentialResults.every((r) => r.verified)).toBe(true);
    expect(result.delegationResult?.decision).toBe('allow');
    expect(result.delegationResult?.summaries?.length ?? 0).toBeGreaterThan(0);
  });

  it('applies cedar configuration when provided', async () => {
    const {
      verifiableCredentials,
      holderDid,
      holderKey,
    } = await buildDelegationChain({});
    const presentation = await signDelegationPresentation({
      verifiableCredential: verifiableCredentials,
      holder: holderDid,
      holderKey,
    });
    const result = await verifyPresentation(presentation, {
      challenge: CHALLENGE,
      domain: DOMAIN,
      failOnUnauthorizedClaims: true,
      cedarAuth: { policies: cedarPolicy(), cedar },
      documentLoader: exampleDocumentLoader,
    });
    expect(result.verified).toBe(true);
    expect(result.delegationResult?.decision).toBe('allow');
    expect(result.delegationResult?.failures ?? []).toHaveLength(0);
  });

  it('verifies longer delegation chains', async () => {
    const {
      verifiableCredentials,
      holderDid,
      holderKey,
    } = await buildDelegationChain({ includeSecondDelegation: true });
    const presentation = await signDelegationPresentation({
      verifiableCredential: verifiableCredentials,
      holder: holderDid,
      holderKey,
    });
    const result = await verifyPresentation(presentation, {
      challenge: CHALLENGE,
      domain: DOMAIN,
      failOnUnauthorizedClaims: true,
      documentLoader: exampleDocumentLoader,
    });
    expect(result.verified).toBe(true);
    const summaries = result.delegationResult?.summaries ?? [];
    const chainSummary = summaries.find(
      (summary) => Array.isArray(summary?.delegations) && summary.delegations.length > 0,
    );
    expect(chainSummary).toBeDefined();
    const tailDepths = summaries.map((summary) => summary?.tailDepth ?? 0);
    const maxTailDepth = tailDepths.length > 0 ? Math.max(...tailDepths) : 0;
    expect(maxTailDepth).toBeGreaterThan(0);
    const delegateIds = chainSummary?.delegations?.map((delegation) => delegation.principalId) ?? [];
    expect(delegateIds).toContain(SECOND_DELEGATE_DID);
  });

  it('handles presentations mixing delegated and standalone credentials', async () => {
    const {
      verifiableCredentials,
      holderDid,
      holderKey,
    } = await buildDelegationChain({});
    const standalone = await issueStandaloneCreditScore({
      id: 'urn:cred:score-standalone',
      creditScore: 730,
      subjectId: 'did:example:secondary-holder',
    });
    const mixedPresentation = await signDelegationPresentation({
      verifiableCredential: [...verifiableCredentials, standalone],
      holder: holderDid,
      holderKey,
    });
    const result = await verifyPresentation(mixedPresentation, {
      challenge: CHALLENGE,
      domain: DOMAIN,
      failOnUnauthorizedClaims: true,
      documentLoader: exampleDocumentLoader,
    });
    expect(result.verified).toBe(true);
    const summaries = result.delegationResult?.summaries ?? [];
    const resourceIds = summaries.map((summary) => summary.resourceId);
    expect(resourceIds).toContain('urn:cred:score-holder');
    expect(resourceIds).toContain('urn:cred:score-standalone');
    const chainSummary = summaries.find(
      (summary) => includesDelegationType(summary?.rootTypes),
    );
    const standaloneSummary = summaries.find(
      (summary) => summary.resourceId === 'urn:cred:score-standalone',
    );
    expect(chainSummary).toBeDefined();
    expect(standaloneSummary).toBeDefined();
  });
});

