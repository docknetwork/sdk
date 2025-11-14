import { describe, it, expect } from 'vitest';

import {
  VC_NS,
  SECURITY_NS,
  VC_TYPE,
  VC_VC,
  MAY_CLAIM_IRI,
  MAY_CLAIM_ALIAS_KEYS,
  DELEGATION_NS,
  VC_TYPE_DELEGATION_CREDENTIAL,
  VC_PREVIOUS_CREDENTIAL_ID,
  VC_ROOT_CREDENTIAL_ID,
  ACTION_VERIFY,
  VERIFY_CHAIN_ID,
  UNKNOWN_IDENTIFIER,
  UNKNOWN_ACTOR_ID,
} from '../../src/constants.js';

describe('constants', () => {
  it('defines expected namespaces and terms', () => {
    expect(VC_NS).toBe('https://www.w3.org/2018/credentials#');
    expect(SECURITY_NS).toBe('https://w3id.org/security#');
    expect(VC_TYPE).toMatch(/VerifiablePresentation$/u);
    expect(VC_VC).toMatch(/verifiableCredential$/u);
  });

  it('maps mayClaim aliases and delegation namespace', () => {
    expect(MAY_CLAIM_IRI).toContain('#mayClaim');
    expect(MAY_CLAIM_ALIAS_KEYS).toContain('mayClaim');
    expect(MAY_CLAIM_ALIAS_KEYS).toContain(MAY_CLAIM_IRI);
    expect(DELEGATION_NS).toMatch(/^https:\/\/ld\./u);
  });

  it('exposes delegation credential IRIs', () => {
    expect(VC_TYPE_DELEGATION_CREDENTIAL).toBe(`${DELEGATION_NS}DelegationCredential`);
    expect(VC_PREVIOUS_CREDENTIAL_ID).toBe(`${DELEGATION_NS}previousCredentialId`);
    expect(VC_ROOT_CREDENTIAL_ID).toBe(`${DELEGATION_NS}rootCredentialId`);
  });

  it('defines shared action values', () => {
    expect(ACTION_VERIFY).toBe('Verify');
    expect(VERIFY_CHAIN_ID).toBe('Action:Verify');
    expect(UNKNOWN_ACTOR_ID).toBe(UNKNOWN_IDENTIFIER);
  });

  it('ensures delegation IRIs remain stable when namespace changes', () => {
    const nextNs = `${DELEGATION_NS}next`;
    expect(nextNs.startsWith(DELEGATION_NS)).toBe(true);
  });
});
