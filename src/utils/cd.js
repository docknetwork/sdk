// Claim deduction from verifiable presentations.

import { expandedCredentialProperty } from './vc';
import deepEqual from 'deep-equal';
import jsonld from 'jsonld';
import { fromJsonldjsCg, asEE, merge } from './claimgraph';
import { validate, prove } from 'rify';
import {
  canonRules, canonProof, canonClaimGraph, decanonClaimGraph, decanonProof
} from './canonicalize';
import { assertType, assert } from './common';

export const expandedLogicProperty = "https://www.dock.io/rdf2020#logicV1";
export const expandedProofProperty = "https://w3id.org/security#proof";
export const expandedIssuerProperty = 'https://www.w3.org/2018/credentials#issuer';

/**
 * Convert a list of expanded credentials which have already been verified into an RDF claim graph.
 * The resulting claimgraph is in Explicit Ethos form.
 *
 * @returns {Promise<[Claim]>}
 */
async function credsToEEClaimGraph(expandedCredentials) {
  let ees = await Promise.all(expandedCredentials.map(credToEECG));
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
  let cred = { ...expandedCredential['@graph'][0] };

  // This line relies on the assumption that if the credential passed verification then the
  // issuer property was not forged.
  assert(cred[expandedIssuerProperty] !== undefined, "encountered credential without an issuer")
  let issuer = cred[expandedIssuerProperty][0]['@id'];

  // remove the proof
  delete cred[expandedProofProperty];

  // convert to claimgraph
  let cg = fromJsonldjsCg(await jsonld.toRDF(cred));

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
  let cg = await presentationToEEClaimGraph(expandedPresentation);

  // get ordered and concatenated proofs
  let proof = jsonld.getValues(expandedPresentation, expandedLogicProperty)
    .map(fromJSONLiteral)
    .flat(1);

  // validate proofs
  let valid = validateh(rules, proof);

  // assert all assumptions made by the proof are in claimgraph
  for (let assumption of valid.assumed) {
    if (!cg.some(claim => claimEq(claim, assumption))) {
      throw { UnverifiableProof: { unverified_assumption: [...assumption] } };
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
  to_prove,
  rules,
) {
  premises = canonClaimGraph(premises);
  to_prove = canonClaimGraph(to_prove);
  rules = canonRules(rules);
  let proof = prove(premises, to_prove, rules);
  return decanonProof(proof);
}

// A wrapper around validate that first converts rules and proof to the canonical representation
// as defined by `canon()` in `claimgraph.js`. This wrapper deserializes the returned values before
// passing them back to the caller.
export function validateh(rules, proof) {
  rules = canonRules(rules);
  proof = canonProof(proof);
  let {
    assumed,
    implied,
  } = validate(rules, proof);
  return {
    assumed: decanonClaimGraph(assumed),
    implied: decanonClaimGraph(implied),
  };
}

/// check two claims for equality
function claimEq(a, b) {
  for (let claim of [a, b]) {
    if (!(claim instanceof Array) || claim.length !== 3) {
      throw new TypeError();
    }
  }
  return deepEqual(a, b);
}

// https://w3c.github.io/json-ld-syntax/#json-literals
function fromJSONLiteral(literal) {
  let expected_props = ['@type', '@value'];
  let actual_props = Object.keys(literal);
  if (!setEq(actual_props, expected_props)) {
    throw {
      UnexpectedJsonLiteralProperties: {
        expected: [...expected_props],
        actual: [...actual_props]
      }
    };
  }
  if (literal['@type'] !== '@json') {
    throw { NotJsonLiteral: { value: literal } };
  }
  return literal['@value'];
}

// check for set equality
// expect(setEq([1, 3], [1, 3])).toBe(true);
// expect(setEq([1], [1, 3])).toBe(false);
function setEq(a, b) {
  let sa = new Set([...a]);
  let sb = new Set([...b]);
  return [...a].every(inA => sb.has(inA)) && [...b].every(inB => sa.has(inB));
}
