import { collectSubjectClaimEntries } from './utils.js';

function buildSubjectClaimValueLookup(allCredentials) {
  const valueLookup = new Map();
  (allCredentials ?? []).forEach((vc) => {
    const subjectId = vc?.credentialSubject?.id;
    if (!subjectId) {
      return;
    }
    const entries = collectSubjectClaimEntries(vc.credentialSubject ?? {});
    entries.forEach(([key, value]) => {
      if (value === undefined) {
        return;
      }
      valueLookup.set(`${subjectId}::${key}`, value);
    });
  });
  return valueLookup;
}

function mergeDerivedFactsIntoClaimsBySubject(derivedFacts, authorizedGraphId, valueLookup) {
  const claimsBySubject = new Map();
  (derivedFacts ?? []).forEach(([subject, claim, value, graph]) => {
    if (graph !== authorizedGraphId) {
      return;
    }
    if (!claimsBySubject.has(subject)) {
      claimsBySubject.set(subject, {});
    }
    const subjectClaims = claimsBySubject.get(subject);
    const lookupKey = `${subject}::${claim}`;
    subjectClaims[claim] = valueLookup.has(lookupKey) ? valueLookup.get(lookupKey) : value;
  });
  return claimsBySubject;
}

function buildUnionFromPerSubject(claimsBySubject, tailSubjectId) {
  const base = tailSubjectId && claimsBySubject.has(tailSubjectId)
    ? { ...claimsBySubject.get(tailSubjectId) }
    : {};
  claimsBySubject.forEach((value, key) => {
    if (key === tailSubjectId) {
      return;
    }
    Object.entries(value).forEach(([claim, claimValue]) => {
      if (!(claim in base)) {
        base[claim] = claimValue;
      }
    });
  });
  return base;
}

export function collectAuthorizedClaims(chain, derivedFacts, authorizedGraphId, allCredentials = []) {
  const valueLookup = buildSubjectClaimValueLookup(allCredentials);
  const claimsBySubject = mergeDerivedFactsIntoClaimsBySubject(
    derivedFacts,
    authorizedGraphId,
    valueLookup,
  );

  const tailSubjectId = chain[chain.length - 1]?.credentialSubject?.id;
  const perSubjectObject = {};
  claimsBySubject.forEach((value, key) => {
    perSubjectObject[key] = { ...value };
  });

  const unionClaims = buildUnionFromPerSubject(claimsBySubject, tailSubjectId);

  return {
    perSubject: perSubjectObject,
    union: unionClaims,
  };
}
