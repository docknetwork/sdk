// Claim deduction from verifiable presentations.

import deepEqual from 'deep-equal';
import jsonld from 'jsonld';
import { validate, prove } from 'rify';
import assert from 'assert';
import { expandedCredentialProperty } from './vc';
import { fromJsonldjsCg, asEE, merge } from './claimgraph';
import {
  canonRules, canonProof, canonClaimGraph, decanonClaimGraph, decanonProof,
} from './canonicalize';
import { assertType } from './common';

export const expandedLogicProperty = 'https://www.dock.io/rdf2020#logicV1';
export const expandedProofProperty = 'https://w3id.org/security#proof';
export const expandedIssuerProperty = 'https://www.w3.org/2018/credentials#issuer';

/**
 * Convert a list of expanded credentials which have already been verified into an RDF claim graph.
 * The resulting claimgraph is in Explicit Ethos form.
 *
 * @returns {Promise<[Claim]>}
 */
async function credsToEEClaimGraph(expandedCredentials) {
  const ees = await Promise.all(expandedCredentials.map(credToEECG));
  return merge(ees);
}

// For future consideration: if an credential contains @graph objects we may need to strip those.
// The reason is that the issuer may not intend to attests to claims in that subgraph.
// It might make sense to instead reify (https://www.w3.org/TR/WD-rdf-syntax-971002/) any subgraphs
// to avoid losing the data they express.
/**
 * Convert a single expanded credential which has already been verified into an RDF claim graph.
 * The resulting claimgraph is in Explicit Ethos form.
 *
 * @returns {Promise<[Claim]>}
 */
async function credToEECG(expandedCredential) {
  assert(Object.keys(expandedCredential).length === 1);
  assert(Object.keys(expandedCredential)[0] === '@graph');
  assert(expandedCredential['@graph'].length === 1);
  const cred = { ...expandedCredential['@graph'][0] };

  // This line relies on the assumption that if the credential passed verification then the
  // issuer property was not forged.
  assert(cred[expandedIssuerProperty] !== undefined, 'encountered credential without an issuer');
  const issuer = cred[expandedIssuerProperty][0]['@id'];

  // remove the proof
  delete cred[expandedProofProperty];

  // convert to claimgraph
  const cg = fromJsonldjsCg(await jsonld.toRDF(cred));

  // convert to explicit ethos form
  return asEE(cg, issuer);
}

/**
 * Returns a list of all RDF statements in the presentation. DOES NOT VERIFY THE
 * PRESENTATION. Verification must be performed for the results of this function to be trustworthy.
 *
 * @param presentation - a VCDM presentation as expanded json-ld
 * @returns {Promise<[Claim]>}
 */
export async function presentationToEEClaimGraph(expandedPresentation) {
  assertType(expandedPresentation, 'object');
  assert(!Array.isArray(expandedPresentation), 'presentation must not be an array');

  // get ordered list of all credentials
  const creds = jsonld.getValues(expandedPresentation, expandedCredentialProperty);

  // convert them to a single claimgraph
  return await credsToEEClaimGraph(creds);
}

export class UnverifiedAssumption extends Error {
  constructor(unverifiedAssumption) {
    super('Proof relies on assumption that are not in the input.');
    this.unverifiedAssumption = unverifiedAssumption;
  }
}

/**
 * Returns a list of all RDF statements proven by the presentation. DOES NOT VERIFY THE
 * PRESENTATION. Verification must be performed for the results of this function to be trustworthy.
 * The return value may contaim duplicate claims.
 *
 * @param presentation - a VCDM presentation as expanded json-ld
 * @param rules - ordered list of axioms which will be accepted within proofs of composite claims
 * @returns {Promise<[Claim]>}
 */
export async function acceptCompositeClaims(expandedPresentation, rules = []) {
  // convert to a claimgraph
  const cg = await presentationToEEClaimGraph(expandedPresentation);

  // get ordered and concatenated proofs
  const proof = jsonld.getValues(expandedPresentation, expandedLogicProperty)
    .map(fromJSONLiteral)
    .flat(1);

  // validate proofs
  const valid = validateh(rules, proof);

  // assert all assumptions made by the proof are in claimgraph
  for (const assumption of valid.assumed) {
    if (!cg.some((claim) => claimEq(claim, assumption))) {
      throw new UnverifiedAssumption([...assumption]);
    }
  }

  // return (claimgraph U proof.implied)
  return [...cg, ...valid.implied];
}

// A wrapper around prove that first converts rules, composite claims, and premises to the
// canonical representation as defined by `canon()` in `claimgraph.js`. This wrapper deserializes
// the returned values before passing them back to the caller.
export function proveh(
  premises,
  toProve,
  rules,
) {
  const proof = prove(
    canonClaimGraph(premises),
    canonClaimGraph(toProve),
    canonRules(rules),
  );
  return decanonProof(proof);
}

// A wrapper around validate that first converts rules and proof to the canonical representation
// as defined by `canon()` in `claimgraph.js`. This wrapper deserializes the returned values before
// passing them back to the caller.
export function validateh(rules, proof) {
  const {
    assumed,
    implied,
  } = validate(
    canonRules(rules),
    canonProof(proof),
  );
  return {
    assumed: decanonClaimGraph(assumed),
    implied: decanonClaimGraph(implied),
  };
}

/// check two claims for equality
function claimEq(a, b) {
  for (const claim of [a, b]) {
    if (!(claim instanceof Array) || claim.length !== 3) {
      throw new TypeError();
    }
  }
  return deepEqual(a, b);
}

// https://w3c.github.io/json-ld-syntax/#json-literals
function fromJSONLiteral(literal) {
  // TODO:
  //   These are checks on potentially untrusted input. Assertions may not be appropriate here.
  //   This invalid input should be reported back to the caller in a way they can handle.
  // REVIEWER:
  //   Do you have any suggestions for how invalid json literals should be reported?
  assert(
    literal['@type'] === '@json',
    'not a json literal',
  );
  assert(
    literal['@value'] !== undefined,
    'json literal value not defined',
  );
  return literal['@value'];
}
