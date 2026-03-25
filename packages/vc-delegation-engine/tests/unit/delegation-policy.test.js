import { describe, it, expect } from 'vitest';

import pharmacyPolicy from '../fixtures/delegation-pharmacy-policy.json' with { type: 'json' };
import { computePolicyDigestHex, verifyPolicyDigest } from '../../src/delegation-policy-digest.js';
import {
  attributesAreNarrowerOrEqual,
  assertGrantSchemaNarrowing,
  validateDelegationPolicy,
} from '../../src/delegation-policy-validate.js';
import {
  assertAdjacentCredentialsMonotonic,
  assertMaxDelegationDepth,
  durationToMilliseconds,
  fetchDelegationPolicyJson,
  isRoleAncestorOrEqual,
  resolveAndVerifyDelegationPolicy,
} from '../../src/delegation-policy-chain.js';
import { DelegationError, DelegationErrorCodes } from '../../src/errors.js';

const mockChainIssuanceDate = '2026-03-20T12:00:00Z';
const mockChainRootExpirationDate = '2026-06-10T12:00:00Z';
const mockPrescriptionResourceId = 'urn:rx:789';

describe('delegation policy digest', () => {
  it('computes stable SHA-256 for pharmacy fixture', () => {
    expect(computePolicyDigestHex(pharmacyPolicy)).toBe(
      'c1eec4edab98e8c71446016d870d0b4520516d937d16717d6458f2a6a0b2b44d',
    );
  });

  it('verifyPolicyDigest returns false on tampered policy', () => {
    const tampered = { ...pharmacyPolicy, version: '9.9' };
    expect(verifyPolicyDigest(tampered, computePolicyDigestHex(pharmacyPolicy))).toBe(false);
  });
});

describe('delegation policy validation', () => {
  it('accepts pharmacy policy document', () => {
    expect(() => validateDelegationPolicy(pharmacyPolicy)).not.toThrow();
  });

  it('rejects policy with non-array ruleset fields', () => {
    const bad = { ruleset: {} };
    expect(() => validateDelegationPolicy(bad)).toThrow(DelegationError);
    expect(() => validateDelegationPolicy(bad)).toThrow(/ruleset\.roles must be an array/);
  });

  it('rejects policy with unknown capability on role', () => {
    const bad = structuredClone(pharmacyPolicy);
    bad.ruleset.roles[1].capabilityGrants.push({ capability: 'nope', schema: { type: 'string' } });
    expect(() => validateDelegationPolicy(bad)).toThrow(DelegationError);
  });

  it('rejects duplicate capability grant names on one role', () => {
    const bad = structuredClone(pharmacyPolicy);
    const pharmacyRole = bad.ruleset.roles.find((r) => r.roleId === 'pharmacy');
    pharmacyRole.capabilityGrants.push({ ...pharmacyRole.capabilityGrants[0] });
    expect(() => validateDelegationPolicy(bad)).toThrow(DelegationError);
    expect(() => validateDelegationPolicy(bad)).toThrow(/unique capability names/);
  });

  it('treats empty child attributes as narrower than wildcard parent', () => {
    expect(attributesAreNarrowerOrEqual([], ['*'])).toBe(true);
  });
});

describe('delegation policy role graph', () => {
  it('treats descendant roles as valid successors of an ancestor role id', () => {
    const roleById = new Map(pharmacyPolicy.ruleset.roles.map((r) => [r.roleId, r]));
    expect(isRoleAncestorOrEqual('doctor', 'patient', roleById)).toBe(true);
    expect(isRoleAncestorOrEqual('doctor', 'pharmacy', roleById)).toBe(true);
    expect(isRoleAncestorOrEqual('pharmacy', 'patient', roleById)).toBe(true);
    expect(isRoleAncestorOrEqual('patient', 'doctor', roleById)).toBe(false);
  });
});

describe('delegation policy chain resolution', () => {
  it('resolves and verifies digest for mock chain', async () => {
    const chain = [
      {
        id: 'urn:root',
        delegationPolicyId: pharmacyPolicy.id,
        delegationPolicyDigest: computePolicyDigestHex(pharmacyPolicy),
        delegationRoleId: 'pharmacy',
        issuanceDate: mockChainIssuanceDate,
        expirationDate: mockChainRootExpirationDate,
        credentialSubject: {
          allowedClaims: ['PickUp', 'Pay'],
          prescriptionResourceIds: [mockPrescriptionResourceId],
          canPickUp: true,
          canPay: true,
        },
        type: ['DelegationCredential'],
      },
    ];
    const out = await resolveAndVerifyDelegationPolicy({
      chain,
      rootPolicyId: pharmacyPolicy.id,
      rootPolicyDigest: computePolicyDigestHex(pharmacyPolicy),
      documentLoader: async () => ({
        contextUrl: null,
        documentUrl: pharmacyPolicy.id,
        document: structuredClone(pharmacyPolicy),
      }),
    });
    expect(out.id).toBe(pharmacyPolicy.id);
  });

  it('throws when documentLoader returns a null document', async () => {
    await expect(
      fetchDelegationPolicyJson(async () => ({ document: null }), pharmacyPolicy.id),
    ).rejects.toMatchObject({ code: DelegationErrorCodes.POLICY_DOCUMENT_LOAD_FAILED });
  });

  it('rejects child credential expiring after parent', async () => {
    const baseSubject = {
      allowedClaims: ['PickUp', 'Pay'],
      prescriptionResourceIds: [mockPrescriptionResourceId],
      canPickUp: true,
      canPay: true,
      PickUp: true,
      Pay: true,
    };
    const chain = [
      {
        id: 'urn:root',
        delegationPolicyId: pharmacyPolicy.id,
        delegationPolicyDigest: computePolicyDigestHex(pharmacyPolicy),
        delegationRoleId: 'pharmacy',
        issuanceDate: mockChainIssuanceDate,
        expirationDate: mockChainRootExpirationDate,
        credentialSubject: { ...baseSubject },
        type: ['DelegationCredential'],
      },
      {
        id: 'urn:child',
        delegationPolicyId: pharmacyPolicy.id,
        delegationPolicyDigest: computePolicyDigestHex(pharmacyPolicy),
        delegationRoleId: 'patient',
        issuanceDate: mockChainIssuanceDate,
        expirationDate: '2026-08-10T12:00:00Z',
        credentialSubject: {
          allowedClaims: ['PickUp'],
          prescriptionResourceIds: [mockPrescriptionResourceId],
          canPickUp: true,
          PickUp: true,
          Pay: true,
        },
        type: ['DelegationCredential'],
      },
    ];
    await expect(
      resolveAndVerifyDelegationPolicy({
        chain,
        rootPolicyId: pharmacyPolicy.id,
        rootPolicyDigest: computePolicyDigestHex(pharmacyPolicy),
        documentLoader: async () => ({ document: structuredClone(pharmacyPolicy) }),
      }),
    ).rejects.toMatchObject({ code: DelegationErrorCodes.POLICY_LIFETIME_INVALID });
  });

  it('throws on digest mismatch', async () => {
    const chain = [
      {
        id: 'urn:root',
        delegationPolicyId: pharmacyPolicy.id,
        delegationPolicyDigest: '0'.repeat(64),
        delegationRoleId: 'pharmacy',
        issuanceDate: mockChainIssuanceDate,
        expirationDate: mockChainRootExpirationDate,
        credentialSubject: {
          allowedClaims: ['PickUp', 'Pay'],
          prescriptionResourceIds: [mockPrescriptionResourceId],
          canPickUp: true,
          canPay: true,
        },
        type: ['DelegationCredential'],
      },
    ];
    await expect(
      resolveAndVerifyDelegationPolicy({
        chain,
        rootPolicyId: pharmacyPolicy.id,
        rootPolicyDigest: '0'.repeat(64),
        documentLoader: async () => ({
          document: structuredClone(pharmacyPolicy),
        }),
      }),
    ).rejects.toMatchObject({ code: DelegationErrorCodes.POLICY_DIGEST_MISMATCH });
  });

  it('rejects policy missing overallConstraints.maxDelegationDepth with typed policy error', async () => {
    const badPolicy = structuredClone(pharmacyPolicy);
    delete badPolicy.ruleset.overallConstraints;
    const chain = [
      {
        id: 'urn:root',
        delegationPolicyId: badPolicy.id,
        delegationPolicyDigest: computePolicyDigestHex(badPolicy),
        delegationRoleId: 'pharmacy',
        issuanceDate: mockChainIssuanceDate,
        expirationDate: mockChainRootExpirationDate,
        credentialSubject: {
          allowedClaims: ['PickUp', 'Pay'],
          prescriptionResourceIds: [mockPrescriptionResourceId],
          canPickUp: true,
          canPay: true,
        },
        type: ['DelegationCredential'],
      },
    ];
    await expect(
      resolveAndVerifyDelegationPolicy({
        chain,
        rootPolicyId: badPolicy.id,
        rootPolicyDigest: computePolicyDigestHex(badPolicy),
        documentLoader: async () => ({ document: structuredClone(badPolicy) }),
      }),
    ).rejects.toMatchObject({ code: DelegationErrorCodes.POLICY_SEMANTIC_INVALID });
  });
});

describe('durationToMilliseconds', () => {
  it('converts days', () => {
    expect(durationToMilliseconds({ value: 90, unit: 'days' })).toBe(90 * 86400000);
  });
});

describe('delegation policy edge cases', () => {
  it('counts delegation steps after root even when root is not DelegationCredential', () => {
    const chain = [
      { id: 'urn:root', type: ['VerifiableCredential'] },
      { id: 'urn:delegated', type: ['DelegationCredential'] },
    ];
    expect(() => assertMaxDelegationDepth(chain, 0)).toThrow(DelegationError);
    expect(() => assertMaxDelegationDepth(chain, 1)).not.toThrow();
  });

  it('accepts equivalent object claims with different key order in monotonic check', () => {
    const capabilityNames = new Set(['scope']);
    const parent = {
      id: 'urn:parent',
      credentialSubject: {
        scope: [{ a: 1, b: 2 }],
      },
    };
    const child = {
      id: 'urn:child',
      credentialSubject: {
        scope: [{ b: 2, a: 1 }],
      },
    };
    expect(() => assertAdjacentCredentialsMonotonic(parent, child, capabilityNames)).not.toThrow();
  });

  it('accepts equivalent direct object claims with different key order in monotonic check', () => {
    const capabilityNames = new Set();
    const parent = {
      id: 'urn:parent',
      credentialSubject: {
        profile: {
          creditScore: 760,
          tier: 'gold',
        },
      },
    };
    const child = {
      id: 'urn:child',
      credentialSubject: {
        profile: {
          tier: 'gold',
          creditScore: 760,
        },
      },
    };
    expect(() => assertAdjacentCredentialsMonotonic(parent, child, capabilityNames)).not.toThrow();
  });

  it('rejects numeric grant schemas that broaden parent minimum/maximum bounds', () => {
    expect(() => assertGrantSchemaNarrowing(
      { type: 'number', minimum: 0 },
      { type: 'number', minimum: 700 },
      'creditScore',
    )).toThrow(/minimum must be >= parent minimum/);

    expect(() => assertGrantSchemaNarrowing(
      { type: 'number', maximum: 1000 },
      { type: 'number', maximum: 100 },
      'creditScore',
    )).toThrow(/maximum must be <= parent maximum/);
  });
});

describe('fetchDelegationPolicyJson', () => {
  it('throws when documentLoader is missing', async () => {
    await expect(fetchDelegationPolicyJson(null, 'urn:x')).rejects.toMatchObject({
      code: DelegationErrorCodes.POLICY_DOCUMENT_LOADER_REQUIRED,
    });
  });
});
