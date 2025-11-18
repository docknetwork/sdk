import { runScenario } from './helpers.js';

const AI_AGENT_CONTEXT = [
  'https://www.w3.org/2018/credentials/v1',
  'https://ld.truvera.io/credentials/delegation',
  {
    '@version': 1.1,
    ai: 'https://example.org/ai#',
    role: 'ai:role',
    actions: 'ai:actions',
    budget: 'ai:budget',
    currency: 'ai:currency',
    canTransact: 'ai:canTransact',
    budgetShareOfCoordinator: 'ai:budgetShareOfCoordinator',
    coordinatorId: 'ai:coordinatorId',
    timeWindowStart: { '@id': 'ai:timeWindowStart', '@type': 'xsd:dateTime' },
    timeWindowEnd: { '@id': 'ai:timeWindowEnd', '@type': 'xsd:dateTime' },
    maxDelegationDepth: 'ai:maxDelegationDepth',
    revoked: 'ai:revoked',
    AIAgentDelegationCredential: 'ai:AIAgentDelegationCredential',
    AIAgentScopeCredential: 'ai:AIAgentScopeCredential',
  },
];

const PRESENTATION_CONTEXT = ['https://www.w3.org/2018/credentials/v1'];

const aiAgentPolicies = {
  staticPolicies: `
    // Baseline constraints – signer alignment, role, coordinator consistency.
    permit(
      principal in Credential::Chain::"Action:Verify",
      action == Credential::Action::"Verify",
      resource in Credential::Object::"AIAgentScopeCredential"
    ) when {
      principal == context.vpSigner &&
      context.tailDepth <= context.rootClaims.maxDelegationDepth &&
      context.tailClaims.role in ["Primary AI Agent", "Hotel Booking Sub-Agent", "Hotel Monitoring Sub-Agent", "Flight Booking Sub-Agent"] &&
      context.tailClaims.coordinatorId == context.rootClaims.coordinatorId &&
      context.tailClaims.canTransact == false
    };

    // Ensure scopes, budgets, and actions shrink each hop.
    forbid(
      principal in Credential::Chain::"Action:Verify",
      action == Credential::Action::"Verify",
      resource in Credential::Object::"AIAgentScopeCredential"
    ) when {
      context.tailClaims.budget > context.parentClaims.budget ||
      context.tailClaims.actions.contains("book") ||
      context.tailClaims.actions.contains("pay") ||
      !context.parentClaims.actions.containsAll(context.tailClaims.actions)
    };

    // Nested time windows must fit inside the parent window.
    forbid(
      principal in Credential::Chain::"Action:Verify",
      action == Credential::Action::"Verify",
      resource in Credential::Object::"AIAgentScopeCredential"
    ) when {
      datetime(context.tailClaims.timeWindowStart) < datetime(context.parentClaims.timeWindowStart) ||
      datetime(context.tailClaims.timeWindowEnd) > datetime(context.parentClaims.timeWindowEnd)
    };

    // Depth limits must strictly decrease, ensuring no further delegation past allowances.
    forbid(
      principal in Credential::Chain::"Action:Verify",
      action == Credential::Action::"Verify",
      resource in Credential::Object::"AIAgentScopeCredential"
    ) when {
      context.parentClaims.maxDelegationDepth <= context.tailClaims.maxDelegationDepth ||
      context.tailClaims.maxDelegationDepth < 0 ||
      context.tailClaims.maxDelegationDepth > context.parentClaims.maxDelegationDepth
    };

    // Aggregated budgets: coordinator-wide share cannot exceed root allowance.
    forbid(
      principal in Credential::Chain::"Action:Verify",
      action == Credential::Action::"Verify",
      resource in Credential::Object::"AIAgentScopeCredential"
    ) when {
      !(context.tailClaims has budgetShareOfCoordinator) ||
      context.tailClaims.budgetShareOfCoordinator < context.tailClaims.budget ||
      context.tailClaims.budgetShareOfCoordinator > context.rootClaims.budget
    };
  `,
};

function normalizeActions(actions = []) {
  return (actions ?? []).slice().sort();
}

function buildDelegationCredential({
  id,
  issuer,
  subjectId,
  previousCredentialId,
  rootCredentialId,
  role,
  actions,
  budget,
  currency,
  canTransact = false,
  coordinatorId,
  timeWindowStart,
  timeWindowEnd,
  maxDelegationDepth,
  budgetShareOfCoordinator,
  revoked = false,
}) {
  return {
    '@context': AI_AGENT_CONTEXT,
    id,
    type: ['VerifiableCredential', 'AIAgentDelegationCredential', 'DelegationCredential'],
    issuer,
    previousCredentialId,
    rootCredentialId,
    credentialSubject: {
      id: subjectId,
      role,
      actions: normalizeActions(actions),
      budget,
      currency,
      canTransact,
      coordinatorId,
      timeWindowStart,
      timeWindowEnd,
      maxDelegationDepth,
      budgetShareOfCoordinator,
      revoked,
    },
  };
}

function buildScopeCredential({
  id,
  issuer,
  previousCredentialId,
  rootCredentialId,
  role,
  actions,
  budget,
  currency,
  coordinatorId,
  timeWindowStart,
  timeWindowEnd,
  maxDelegationDepth,
  budgetShareOfCoordinator,
}) {
  return {
    '@context': AI_AGENT_CONTEXT,
    id,
    type: ['VerifiableCredential', 'AIAgentScopeCredential'],
    issuer,
    previousCredentialId,
    rootCredentialId,
    credentialSubject: {
      id: issuer,
      role,
      actions: normalizeActions(actions),
      budget,
      currency,
      canTransact: false,
      coordinatorId,
      timeWindowStart,
      timeWindowEnd,
      maxDelegationDepth,
      budgetShareOfCoordinator,
    },
  };
}

function buildPresentation(verifiableCredential) {
  return {
    '@context': PRESENTATION_CONTEXT,
    type: ['VerifiablePresentation'],
    proof: {
      type: 'Ed25519Signature2018',
      created: '2025-03-01T09:00:00Z',
      verificationMethod: 'did:traveler:alice#auth-key',
      proofPurpose: 'authentication',
      challenge: 'ai-agent-delegation',
      domain: 'travels.example',
      jws: 'test.ai..signature',
    },
    verifiableCredential,
  };
}

const coordinatorId = 'did:corp:primary-agent';
const rootDelegationId = 'urn:cred:ai-root';

const userToPrimary = buildDelegationCredential({
  id: rootDelegationId,
  issuer: 'did:traveler:alice',
  subjectId: coordinatorId,
  previousCredentialId: null,
  rootCredentialId: rootDelegationId,
  role: 'Primary AI Agent',
  actions: ['search', 'recommend', 'monitor', 'coordinate'],
  budget: 5000,
  currency: 'USD',
  coordinatorId,
  timeWindowStart: '2025-03-01T09:00:00Z',
  timeWindowEnd: '2025-03-05T09:00:00Z',
  maxDelegationDepth: 3,
  budgetShareOfCoordinator: 5000,
});

const primaryToHotel = buildDelegationCredential({
  id: 'urn:cred:ai-hotel',
  issuer: coordinatorId,
  subjectId: 'did:agent:hotel-booker',
  previousCredentialId: rootDelegationId,
  rootCredentialId: rootDelegationId,
  role: 'Hotel Booking Sub-Agent',
  actions: ['search', 'recommend'],
  budget: 1500,
  currency: 'USD',
  coordinatorId,
  timeWindowStart: '2025-03-01T10:00:00Z',
  timeWindowEnd: '2025-03-02T18:00:00Z',
  maxDelegationDepth: 1,
});

const hotelToMonitor = buildDelegationCredential({
  id: 'urn:cred:ai-monitor',
  issuer: 'did:agent:hotel-booker',
  subjectId: 'did:agent:hotel-monitor',
  previousCredentialId: 'urn:cred:ai-hotel',
  rootCredentialId: rootDelegationId,
  role: 'Hotel Monitoring Sub-Agent',
  actions: ['monitor'],
  budget: 200,
  currency: 'USD',
  coordinatorId,
  timeWindowStart: '2025-03-01T10:30:00Z',
  timeWindowEnd: '2025-03-01T22:00:00Z',
  maxDelegationDepth: 0,
});

const hotelMonitorScope = buildScopeCredential({
  id: 'urn:cred:ai-monitor-scope',
  issuer: 'did:agent:hotel-monitor',
  previousCredentialId: 'urn:cred:ai-monitor',
  rootCredentialId: rootDelegationId,
  role: 'Hotel Monitoring Sub-Agent',
  actions: ['monitor'],
  budget: 150,
  currency: 'USD',
  coordinatorId,
  timeWindowStart: '2025-03-01T11:00:00Z',
  timeWindowEnd: '2025-03-01T21:00:00Z',
  maxDelegationDepth: 0,
  budgetShareOfCoordinator: 1700,
});

const primaryToFlight = buildDelegationCredential({
  id: 'urn:cred:ai-flight',
  issuer: coordinatorId,
  subjectId: 'did:agent:flight-booker',
  previousCredentialId: rootDelegationId,
  rootCredentialId: rootDelegationId,
  role: 'Flight Booking Sub-Agent',
  actions: ['search', 'recommend'],
  budget: 2000,
  currency: 'USD',
  coordinatorId,
  timeWindowStart: '2025-03-01T10:00:00Z',
  timeWindowEnd: '2025-03-03T23:00:00Z',
  maxDelegationDepth: 0,
});

const invalidFlightScope = buildScopeCredential({
  id: 'urn:cred:ai-flight-scope-invalid',
  issuer: 'did:agent:flight-booker',
  previousCredentialId: 'urn:cred:ai-flight',
  rootCredentialId: rootDelegationId,
  role: 'Flight Booking Sub-Agent',
  actions: ['search', 'book'], // violates critical action restriction
  budget: 2500, // exceeds parent
  currency: 'USD',
  coordinatorId,
  timeWindowStart: '2025-03-01T08:00:00Z', // earlier than parent start
  timeWindowEnd: '2025-03-05T10:00:00Z', // later than parent end
  maxDelegationDepth: 1, // exceeds allowance
  budgetShareOfCoordinator: 6000, // aggregated budgets exceed root allowance
});

async function runAiScenario(title, chain) {
  await runScenario(title, buildPresentation(chain), aiAgentPolicies);
}

await runAiScenario(
  'AI AGENT - VALID HOTEL MONITORING',
  [userToPrimary, primaryToHotel, hotelToMonitor, hotelMonitorScope],
);

await runAiScenario(
  'AI AGENT - INVALID FLIGHT ACTIONS',
  [userToPrimary, primaryToFlight, invalidFlightScope],
);

