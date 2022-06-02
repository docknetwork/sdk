// Claim deduction from verifiable presentations.

import deepEqual from 'deep-equal';
import jsonld from 'jsonld';
import { validate, prove, infer } from 'rify';
import { assert } from '@polkadot/util';
import { expandedCredentialProperty } from './vc/constants';
import { fromJsonldjsCg, merge } from './claimgraph';
import {
  canonRules, canonProof, canonClaimGraph, decanonClaimGraph, decanonProof,
} from './canonicalize';
import { assertValidNode, assertType } from './common';

export const expandedLogicProperty = 'https://www.dock.io/rdf2020#logicV1';
export const expandedProofProperty = 'https://w3id.org/security#proof';
export const expandedIssuerProperty = 'https://www.w3.org/2018/credentials#issuer';

/**
 * Returns a list of all RDF statements proven by the presentation. DOES NOT VERIFY THE
 * PRESENTATION. Verification must be performed for the results of this function to be trustworthy.
 * The return value may contaim duplicate claims.
 *
 * This function throws an error if:
 * a provided proof is not applicable given the ruleset,
 * a provided proof makes unverified assumptions,
 * a provided proof is malformed.
 *
 * @param expandedPresentation - a VCDM presentation as expanded json-ld
 * @param rules - ordered list of axioms which will be accepted within proofs of composite claims
 * @returns {Promise<Object[]>}
 */
export async function acceptCompositeClaims(expandedPresentation, rules) {
  assert(
    rules !== undefined,
    'An axiom list must be provided. Hint: rules may be "[]" to reject all.',
  );

  const cg = await presentationToEEClaimGraph(expandedPresentation);
  const proof = extractProof(expandedPresentation);
  const implied = getImplications(cg, proof, rules);

  // return (claimgraph U implied)
  return [...cg, ...implied];
}

/**
 * Convert a list of expanded credentials which have already been verified into an RDF claim graph.
 * The resulting claimgraph is in Explicit Ethos form.
 *
 * @param expandedCredentials - A list of expanded credentials, each is expected to be a separate
 *                              @graph.
 * @returns {Promise<Object[]>}
 */
async function credsToEEClaimGraph(expandedCredentials) {
  const ees = await Promise.all(expandedCredentials.map(credToEECG));
  return merge(ees);
}

/**
 * Convert a single expanded credential which has already been verified into an RDF claim graph.
 *
 * @returns {Promise<Object[]>}
 */
async function credToEECG(expandedCredential) {
  assert(
    expandedCredential['@graph'] !== undefined,
    'Expected each credential to expand to its own @graph',
  );
  const cred = { ...unwrapE(expandedCredential['@graph']) };

  // This line relies on the assumption that if the credential passed verification then the
  // issuer property was not forged.
  assert(cred[expandedIssuerProperty] !== undefined, 'encountered credential without an issuer');
  const issuer = cred[expandedIssuerProperty][0]['@id'];
  assertType(issuer, 'string');
  assert(!issuer.startsWith('_:'), 'issuer is assumed not to be a blank node');

  // remove the proof
  delete cred[expandedProofProperty];

  // convert to claimgraph
  const cg = fromJsonldjsCg(await jsonld.toRDF(cred));

  for (const claim of cg) {
    // Credentials containing a "@graph" declaration will cause an assertion error here.
    // And rightfully so. Here's why:
    // Each statement in a cred is passed to the reasoner as a quad with `issuer` as the graph.
    // It would be potentially incorrect to overwrite a non-default graph.
    // Leaving a non-default graph as-is would be unsafe.
    // While it would be valid to simply delete quads with non-default graphs, it would be confusing
    // to users if the content of their credential was swallowed without warning.
    assert(deepEqual(claim[3], { DefaultGraph: true }), 'subgraph found in credential');
    claim[3] = { Iri: issuer };
  }

  return cg;
}

/**
 * Returns a list of all RDF statements in the presentation. DOES NOT VERIFY THE
 * PRESENTATION. Verification must be performed for the results of this function to be trustworthy.
 *
 * @param expandedPresentation - a VCDM presentation as expanded json-ld
 * @returns {Promise<Object[]>}
 */
export async function presentationToEEClaimGraph(expandedPresentation) {
  const ep = unwrapE(expandedPresentation);

  // get ordered list of all credentials
  const creds = jsonld.getValues(ep, expandedCredentialProperty);

  // convert them to a single claimgraph
  return credsToEEClaimGraph(creds);
}

export class UnverifiedAssumption extends Error {
  constructor(unverifiedAssumption) {
    super('Proof relies on assumption that are not in the input.');
    this.unverifiedAssumption = unverifiedAssumption;
  }
}

/**
 * Extracts any included proofs of composite claims from a presentation.
 * The presentation must be in expanded form.
 * Returns the proofs, concatenated together.
 *
 * @param expandedPresentation - a VCDM presentation as expanded json-ld
 * @returns {Promise<Object[]>}
 */
export function extractProof(expandedPresentation) {
  return jsonld.getValues(unwrapE(expandedPresentation), expandedLogicProperty)
    .map(fromJSONLiteral)
    .flat(1);
}

/**
 * Given a claimgraph of true assumptions, and the allowed logical rules, return the claims that are
 * proven true by proof. If the proof is not applicable given the ruleset, or makes unverified
 * assumptions, throw an error. The return value may contain duplicate claims.
 *
 * @param claimgraph - known true assumptions (usually extracted from a presentation or a cred)
 * @param proof - proof of composite claims (usually comes from calling proveh())
 * @param rules - ordered list of axioms
 * @returns {Object[]}
 */
export function getImplications(claimgraph, proof, rules) {
  const valid = validateh(rules, proof);

  // Check that all assumptions made by the proof were provided in the claimgraph of assumptions
  for (const assumption of valid.assumed) {
    if (!claimgraph.some((claim) => claimEq(claim, assumption))) {
      throw new UnverifiedAssumption([...assumption]);
    }
  }

  return valid.implied;
}

/**
 * Given the assumptions encoded in the provided presentation, prove a list of composite claims.
 * T return proof of composite claims as a jsonld json literal which can be attached directly to a
 * presentation as {expandedLogicProperty} before [signing and ]submitting.
 *
 * This function throws an error if the requested composite claims are unprovable.
 *
 * @param expandedPresentation - a VCDM presentation as expanded json-ld
 * @param compositeClaims - claims to prove, provide in claimgraph format
 * @param rules - ordered list of axioms which will be accepted within proofs of composite claims
 * @returns {Promise<Object>} - proof is returned as a json literal
 */
export async function proveCompositeClaims(expandedPresentation, compositeClaims, rules) {
  assert(
    rules !== undefined,
    'An axiom list must be provided. Hint: rules may be "[]" to reject all.',
  );
  const cg = await presentationToEEClaimGraph(expandedPresentation);
  const prevProof = await extractProof(expandedPresentation);
  const newProof = proveh(cg, compositeClaims, rules);
  return toJsonLiteral(prevProof.concat(newProof));
}

// prove-high
// A higher level wrapper around prove that first converts rules, composite claims, and premises to
// the canonical representation as defined by `canon()` in `claimgraph.js`. This wrapper
// deserializes the returned values before passing them back to the caller.
export function proveh(
  premises,
  toProve,
  rules,
) {
  foreachQuadInRules(rules, assertQuad);
  premises.forEach(assertQuad);
  toProve.forEach(assertQuad);
  const proof = prove(
    canonClaimGraph(premises),
    canonClaimGraph(toProve),
    canonRules(rules),
  );
  return decanonProof(proof);
}

// validate-high
// A higher level wrapper around validate that first converts rules and proof to the canonical
// representation as defined by `canon()` in `claimgraph.js`. This wrapper deserializes the
// returned values before passing them back to the caller.
export function validateh(rules, proof) {
  foreachQuadInRules(rules, assertQuad);
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

// infer-high
// A higher level wrapper around infer that first converts premises and rules to the canonical
// representation as defined by `canon()` in `claimgraph.js`. This wrapper deserializes the
// returned values before passing them back to the caller.
export function inferh(premises, rules) {
  premises.forEach(assertQuad);
  foreachQuadInRules(rules, assertQuad);
  const inferred = infer(canonClaimGraph(premises), canonRules(rules));
  return decanonClaimGraph(inferred);
}

function foreachQuadInRules(rules, f) {
  for (const rule of rules) {
    for (const quad of rule.if_all) {
      f(quad);
    }
    for (const quad of rule.then) {
      f(quad);
    }
  }
}

function assertQuad(quad) {
  assert(quad.length === 4, () => `Quads must have length 4, got: ${JSON.stringify(quad)}`);
}

/// check two claims for equality
function claimEq(a, b) {
  for (const claim of [a, b]) {
    if (!(claim instanceof Array) || claim.length !== 4) {
      throw new TypeError();
    }
    for (const node of claim) {
      assertValidNode(node);
    }
  }
  return deepEqual(a, b);
}

// https://w3c.github.io/json-ld-syntax/#json-literals
function fromJSONLiteral(literal) {
  if (literal['@type'] !== '@json') {
    throw new TypeError(`not a json literal: ${literal}`);
  }
  if (literal['@value'] === undefined) {
    throw new TypeError(`json literal has no "@value": ${literal}`);
  }
  return literal['@value'];
}

// https://w3c.github.io/json-ld-syntax/#json-literals
function toJsonLiteral(json) {
  return {
    '@type': '@json',
    '@value': JSON.parse(JSON.stringify(json)),
  };
}

// Unwrap Expanded jsonld
//
// jsonld expansion by jsonld-js results in an array. This module operates on expanded jsonld so
// getting the first and only element from that expanded array is a common task.
//
// We assume that a root level expanded jsonld object will always be an array with exactly one
// element.
function unwrapE(expanded) {
  assert(
    Array.isArray(expanded) && expanded.length === 1,
    'expected expanded jsonld as an array of one element',
  );
  return expanded[0];
}
