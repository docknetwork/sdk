// Claim deduction from verifiable presentations.

import { expandedCredentialProperty } from './vc';
import jsonld from 'jsonld';

export const expandedLogicProperty = "https://www.dock.io/ontology/logicV1";

/**
 * Convert a list of credentials which have already been verified into an RDF claim graph.
 * The resulting claimgraph is in Explicit Ethos form.
 *
 * @returns {Promise<[Claim]>}
 */
async function credsToEEClaimGraph(_credentials) {
  // TODO
  return [];
}

/**
 * Returns a list of all RDF statements proven by the presentation. DOES NOT VERIFY THE
 * PRESENTATION. Verification must be performed for the results of this function to be trustworthy.
 * The return value may contaim duplicate claims.
 *
 * @param presentation - a VCDM presentation as json-ld
 * @param rules - ordered list of axioms which will be accepted within proofs of composite claims
 * @returns {Promise<[Claim]>}
 */
export async function acceptCompositeClaims(presentation, rules = []) {
  const expanded = await jsonld.expand(presentation);

  // get ordered list of all credentials
  const creds = jsonld.getValues(expanded, expandedCredentialProperty);

  // convert them to a single claimgraph
  let cg = await credsToEEClaimGraph(creds);

  // get ordered list of all proofs
  let proofs = jsonld.getValues(expanded, expandedLogicProperty);

  // concatenate all proofs into a single proof
  let superproof = proofs.flat(1);

  // validate superproof
  let valid = validate(rules, superproof);

  // assert all superproof.assumed in superproof are in claimgraph
  for (let assumption of valid.assumed) {
    if (!cg.some(claim => claim_eq(claim, assumption))) {
      throw { UnverifiableProof: { unverified_assumption: [...assumption] } };
    }
  }

  // return (claimgraph U superproof.implied)
  return [...cg, ...valid.implied];
}

// dummy function
export function prove(
  _premises,
  _to_prove,
  _rules,
) {
  return [];
}

// dummy function
export function validate(_rules, _proof) {
  return {
    assumed: [],
    implied: [],
  };
}

/// check two claims for equality
function claim_eq(a, b) {
  for (claim of [a, b]) {
    if (!(claim instanceof Array) || claim.length !== 3) {
      throw new TypeError();
    }
  }
  return a[0] === b[0] && a[1] === b[1] && a[2] == b[2];
}
