import { describe, it, expect } from 'vitest';

import {
  collectActorIds,
  ensureEntity,
  addParent,
  baseEntities,
  applyCredentialFacts,
} from '../../src/cedar-utils.js';

describe('cedar-utils', () => {
  it('collects unique actor ids from credentials and signer', () => {
    const ids = collectActorIds(
      [
        { issuer: 'did:a', credentialSubject: { id: 'did:b' } },
        { issuer: 'did:c' },
      ],
      'did:d',
    );
    expect(ids).toEqual(expect.arrayContaining(['did:a', 'did:b', 'did:c', 'did:d']));
  });

  it('ensures entity uniqueness and parent relationships', () => {
    const entities = [];
    const actor = ensureEntity(entities, 'Actor', '1');
    addParent(actor, { type: 'Parent', id: 'P' });
    addParent(actor, { type: 'Parent', id: 'P' }); // dedupe
    expect(entities).toHaveLength(1);
    expect(actor.parents).toHaveLength(1);
  });

  it('builds base entities and applies credential facts', () => {
    const entities = baseEntities(['did:holder'], ['Custom']);
    applyCredentialFacts(entities, {
      resourceId: 'urn:cred',
      actionIds: ['Verify'],
      delegations: [{ principalId: 'did:holder', actions: ['Verify'] }],
    });
    const resource = entities.find((entry) => entry.uid.type === 'Credential::Object');
    expect(resource.parents).toEqual(expect.arrayContaining([{ type: 'Credential::Chain', id: 'Action:Verify' }]));
  });
});
