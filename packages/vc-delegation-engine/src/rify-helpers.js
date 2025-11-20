/* eslint-disable sonarjs/cognitive-complexity */
import { matchesType } from './jsonld-utils.js';
import { extractMayClaims, collectSubjectClaimEntries } from './utils.js';

export function buildRifyRules(rootGraphId, authorizedGraphId) {
  if (!rootGraphId) {
    throw new Error('buildRifyRules requires a root graph identifier');
  }
  if (!authorizedGraphId) {
    throw new Error('buildRifyRules requires an authorized graph identifier');
  }

  return [
    {
      if_all: [
        [{ Unbound: 'p' }, { Bound: 'allows' }, { Unbound: 'c' }, { Bound: rootGraphId }],
        [{ Unbound: 'p' }, { Bound: 'delegatesTo' }, { Unbound: 'd' }, { Bound: rootGraphId }],
        [{ Unbound: 'd' }, { Bound: 'listsClaim' }, { Unbound: 'c' }, { Bound: rootGraphId }],
      ],
      then: [
        [{ Unbound: 'd' }, { Bound: 'allows' }, { Unbound: 'c' }, { Bound: rootGraphId }],
      ],
    },
    {
      if_all: [
        [{ Unbound: 'p' }, { Bound: 'allows' }, { Unbound: 'c' }, { Bound: rootGraphId }],
        [{ Unbound: 'p' }, { Bound: 'delegatesTo' }, { Unbound: 'd' }, { Bound: rootGraphId }],
        [{ Unbound: 'd' }, { Bound: 'inheritsParent' }, { Bound: 'true' }, { Bound: rootGraphId }],
      ],
      then: [
        [{ Unbound: 'd' }, { Bound: 'allows' }, { Unbound: 'c' }, { Bound: rootGraphId }],
      ],
    },
    {
      if_all: [
        [{ Unbound: 's' }, { Unbound: 'c' }, { Unbound: 'v' }, { Unbound: 'iss' }],
        [{ Unbound: 'iss' }, { Bound: 'allows' }, { Unbound: 'c' }, { Bound: rootGraphId }],
      ],
      then: [
        [{ Unbound: 's' }, { Unbound: 'c' }, { Unbound: 'v' }, { Bound: authorizedGraphId }],
      ],
    },
  ];
}

export function buildRifyPremisesFromChain(chain, rootGraphId) {
  if (!Array.isArray(chain) || chain.length === 0) {
    throw new Error('buildRifyPremisesFromChain requires a non-empty chain');
  }
  if (typeof rootGraphId !== 'string' || rootGraphId.length === 0) {
    throw new Error('Root credential must include an id for rify premises');
  }
  const premises = [];
  const rootCredential = chain[0];
  const rootSubjectId = rootCredential.credentialSubject?.id;
  const rootMayClaims = extractMayClaims(rootCredential.credentialSubject ?? {});

  if (rootSubjectId) {
    rootMayClaims.forEach((claim) => {
      premises.push([rootSubjectId, 'allows', claim, rootGraphId]);
    });
  }

  for (const vc of chain) {
    if (!matchesType(vc, 'DelegationCredential')) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const parent = vc.issuer;
    const child = vc.credentialSubject?.id;
    if (!parent || !child) {
      // eslint-disable-next-line no-continue
      continue;
    }

    premises.push([parent, 'delegatesTo', child, rootGraphId]);

    const listed = extractMayClaims(vc.credentialSubject ?? {});
    if (listed.length > 0) {
      listed.forEach((claim) => {
        premises.push([child, 'listsClaim', claim, rootGraphId]);
      });
    }
  }

  const rootId = rootCredential.id;
  const attestations = (chain ?? []).filter(
    (vc) => vc.rootCredentialId === rootId || vc.id === rootId,
  );

  attestations.forEach((vc) => {
    const subjectId = vc.credentialSubject?.id;
    const issuerId = vc.issuer;
    if (!subjectId || !issuerId) {
      return;
    }
    const claimEntries = collectSubjectClaimEntries(vc.credentialSubject ?? {});
    claimEntries.forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      let valueForPremise;
      if (value && typeof value === 'object') {
        valueForPremise = JSON.stringify(value);
      } else if (typeof value === 'string') {
        valueForPremise = value;
      } else {
        valueForPremise = String(value);
      }
      premises.push([subjectId, key, valueForPremise, issuerId]);
      if (vc.id === rootId) {
        premises.push([issuerId, 'allows', key, rootGraphId]);
      }
    });
  });

  const invalidPremises = premises.filter(
    (quad) => !Array.isArray(quad) || quad.length !== 4 || quad.some((item) => item === undefined),
  );
  if (invalidPremises.length > 0) {
    throw new Error(
      `Invalid premises generated: ${JSON.stringify(
        invalidPremises,
      )} | root ${rootGraphId}`,
    );
  }

  return premises;
}
