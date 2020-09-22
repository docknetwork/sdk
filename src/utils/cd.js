// Claim deduction from verifiable presentations.

import { expandedCredentialProperty } from './vc';
import jsonld from 'jsonld';
import { fromJsonldjsCg, asEE, merge } from './claimgraph';

export const expandedLogicProperty = "https://www.dock.io/rdf2020#logicV1";
export const expandedProofProperty = "https://w3id.org/security#proof";
export const expandedIssuerProperty = 'https://www.w3.org/2018/credentials/v1#issuer';

/**
 * Convert a list of expanded credentials which have already been verified into an RDF claim graph.
 * The resulting claimgraph is in Explicit Ethos form.
 *
 * @returns {Promise<[Claim]>}
 */
async function credsToEEClaimGraph(expandedCredentials) {
  let ees = await Promise.all(expandedCredentials.map(credToEECG));
  return ees.reduce(merge, []);
}

/**
 * Convert a single expanded credential which has already been verified into an RDF claim graph.
 * The resulting claimgraph is in Explicit Ethos form.
 *
 * @returns {Promise<[Claim]>}
 */
async function credToEECG(expandedCredential) {
  let cred = { ...expandedCredential };

  // This line relies on the assumption that if the credential passed verification then the
  // issuer property was not forged.
  let issuer = cred[expandedIssuerProperty][0];

  // remove the proof
  delete cred[expandedProofProperty];

  // convert to claimgraph
  let cg = fromJsonldjsCg(await jsonld.toRDF(credential));

  // convert to explicit ethos form
  return asEE(cg, issuer);
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

  // get ordered and concatenated proofs
  let proof = jsonld.getValues(expanded, expandedLogicProperty)
    .map(fromJSONLiteral)
    .flat(1);

  // validate proofs
  let valid = validate(rules, proof);

  // assert all superproof.assumed in proof are in claimgraph
  for (let assumption of valid.assumed) {
    if (!cg.some(claim => claimEq(claim, assumption))) {
      throw { UnverifiableProof: { unverified_assumption: [...assumption] } };
    }
  }

  // return (claimgraph U proof.implied)
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
function claimEq(a, b) {
  for (claim of [a, b]) {
    if (!(claim instanceof Array) || claim.length !== 3) {
      throw new TypeError();
    }
  }
  return a[0] === b[0] && a[1] === b[1] && a[2] == b[2];
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
