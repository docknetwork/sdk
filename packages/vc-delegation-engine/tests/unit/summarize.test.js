import { describe, it, expect } from 'vitest';

import { summarizeDelegationChain, summarizeStandaloneCredential } from '../../src/summarize.js';
import {
  VC_PREVIOUS_CREDENTIAL_ID,
  VC_ROOT_CREDENTIAL_ID,
  VC_SUBJECT,
  VC_ISSUER,
  VC_TYPE_DELEGATION_CREDENTIAL,
} from '../../src/constants.js';

const ROOT_ID = 'urn:cred:root';
const SUBJECT_KEY = VC_SUBJECT;
const ISSUER_KEY = VC_ISSUER;
const DELEGATE_ID = 'did:delegate';
const SUBJECT_ID = 'did:subject';

function credential({
  id,
  issuer,
  subject,
  previousCredentialId,
  rootCredentialId = ROOT_ID,
  type = VC_TYPE_DELEGATION_CREDENTIAL,
}) {
  const node = {
    '@id': id,
    '@type': [type],
  };
  node[ISSUER_KEY] = [{ '@id': issuer }];
  node[SUBJECT_KEY] = [{ '@id': subject }];
  node[VC_ROOT_CREDENTIAL_ID] = [{ '@id': rootCredentialId }];
  if (previousCredentialId) {
    node[VC_PREVIOUS_CREDENTIAL_ID] = [{ '@id': previousCredentialId }];
  }
  return node;
}

describe('summarize', () => {
  it('summarizes delegation chains', () => {
    const root = credential({ id: ROOT_ID, issuer: 'did:root', subject: DELEGATE_ID });
    const child = credential({
      id: 'urn:cred:child',
      issuer: DELEGATE_ID,
      subject: SUBJECT_ID,
      previousCredentialId: ROOT_ID,
    });
    const summary = summarizeDelegationChain([root, child]);
    expect(summary.rootIssuerId).toBe('did:root');
    expect(summary.tailIssuerId).toBe(DELEGATE_ID);
    expect(summary.tailDepth).toBeGreaterThan(0);
  });

  it('summarizes standalone credentials without delegation links', () => {
    const standalone = summarizeStandaloneCredential({
      id: 'urn:cred',
      type: 'SimpleCredential',
      issuer: 'did:issuer',
    });
    expect(standalone.tailDepth).toBe(0);
    expect(standalone.rootTypes).toEqual(['SimpleCredential']);
  });
});
