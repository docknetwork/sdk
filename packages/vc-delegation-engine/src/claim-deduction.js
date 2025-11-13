import { MAY_CLAIM_ALIAS_KEYS } from './constants.js';

export function collectAuthorizedClaims(chain, derivedFacts, authorizedGraphId, allCredentials = []) {
  const valueLookup = new Map();
  (allCredentials ?? []).forEach((vc) => {
    const subjectId = vc?.credentialSubject?.id;
    if (!subjectId) {
      return;
    }
    Object.entries(vc.credentialSubject ?? {}).forEach(([key, value]) => {
      if (key === 'id' || MAY_CLAIM_ALIAS_KEYS.includes(key)) {
        return;
      }
      const storeValue = (entry) => {
        if (entry === undefined) {
          return;
        }
        valueLookup.set(`${subjectId}::${key}`, entry);
      };
      if (Array.isArray(value)) {
        value.forEach(storeValue);
      } else {
        storeValue(value);
      }
    });
  });

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

  const tailSubjectId = chain[chain.length - 1]?.credentialSubject?.id;
  const perSubjectObject = {};
  claimsBySubject.forEach((value, key) => {
    perSubjectObject[key] = { ...value };
  });

  const unionClaims = tailSubjectId && perSubjectObject[tailSubjectId]
    ? { ...perSubjectObject[tailSubjectId] }
    : {};

  claimsBySubject.forEach((value, key) => {
    if (key === tailSubjectId) {
      return;
    }
    Object.entries(value).forEach(([claim, claimValue]) => {
      if (!(claim in unionClaims)) {
        unionClaims[claim] = claimValue;
      }
    });
  });

  return {
    perSubject: perSubjectObject,
    union: unionClaims,
  };
}
