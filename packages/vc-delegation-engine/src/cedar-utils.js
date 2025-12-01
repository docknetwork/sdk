import { ACTION_VERIFY, VERIFY_CHAIN_ID } from './constants.js';

export function collectActorIds(credentials, signer) {
  const ids = new Set();
  (credentials ?? []).forEach((vc) => {
    if (vc && typeof vc.issuer === 'string') {
      ids.add(vc.issuer);
    }
    const subjectId = vc?.credentialSubject?.id;
    if (typeof subjectId === 'string') {
      ids.add(subjectId);
    }
  });
  if (typeof signer === 'string' && signer.length > 0) {
    ids.add(signer);
  }
  return Array.from(ids);
}

export function ensureEntity(entities, type, id) {
  let entity = entities.find((entry) => entry.uid.type === type && entry.uid.id === id);
  if (!entity) {
    entity = { uid: { type, id }, attrs: {}, parents: [] };
    entities.push(entity);
  }
  return entity;
}

export function addParent(entity, parent) {
  if (!entity.parents.some((p) => p.type === parent.type && p.id === parent.id)) {
    entity.parents.push(parent);
  }
}

export function baseEntities(actorIds, actionIds = []) {
  const entities = [];

  entities.push({ uid: { type: 'Credential::Action', id: ACTION_VERIFY }, attrs: {}, parents: [] });

  new Set(actorIds ?? []).forEach((id) => {
    entities.push({ uid: { type: 'Credential::Actor', id }, attrs: {}, parents: [] });
  });

  (actionIds ?? []).forEach((id) => {
    if (id !== ACTION_VERIFY) {
      entities.push({ uid: { type: 'Credential::Action', id }, attrs: {}, parents: [] });
    }
  });

  return entities;
}

export function entityRef(type, id) {
  return { __entity: { type, id } };
}

// Adds chain membership facts (Verify action relationships) to Cedar entities.
export function applyCredentialFacts(entities, { resourceId, actionIds: _actionIds, delegations }) {
  const resourceEntity = ensureEntity(entities, 'Credential::Object', resourceId);

  const verifyChain = ensureEntity(entities, 'Credential::Chain', VERIFY_CHAIN_ID);
  addParent(resourceEntity, verifyChain.uid);

  delegations.forEach(({ principalId, actions }) => {
    const principalEntity = ensureEntity(entities, 'Credential::Actor', principalId);
    (actions ?? []).forEach((actionId) => {
      if (actionId !== ACTION_VERIFY) {
        throw new Error(`Unexpected action "${actionId}" encountered; expected only "Verify"`);
      }
      const actionChain = verifyChain;
      if (actionChain) {
        addParent(principalEntity, actionChain.uid);
      }
    });
  });
}
