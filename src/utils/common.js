// Helpers for internal use by sdk utilities.
// The api of this module is not guaranteed to be stable.

import { assert } from '@polkadot/util';

// deep copy a json serializable object
export function deepClone(obj) {
  // https://jsben.ch/E55IQ
  return JSON.parse(JSON.stringify(obj));
}

export function assertValidClaimGraph(cg) {
  for (const claim of cg) {
    assert(claim.length === 4, 'claimgraphs must be quads');
    for (const node of claim) {
      assertValidNode(node);
    }
  }
}

export function assertValidNode(node) {
  const ks = Object.keys(node);
  assert(ks.length === 1, 'enum representaion invalid. enum must be exactly one variant');
  const tag = ks[0];
  const value = node[tag];
  switch (tag) {
    case 'DefaultGraph':
      assert(value === true, 'DefaultGraph must be true'); // asserting both type and value
      break;
    case 'Iri':
      assertType(value, 'string');
      break;
    case 'Blank':
      assertType(value, 'string');
      break;
    case 'Literal':
      assertType(value, 'object');
      assert(Object.keys(value).length === 2, 'Literals must have exactly two fields');
      assertType(value.value, 'string');
      assertType(value.datatype, 'string');
      break;
    default:
      throw new TypeError(`Bad node tag: ${tag}`);
  }
}

export function assertType(a, typ) {
  const t = typeof a;
  if (t !== typ) {
    throw new TypeError(`Expected type ${typ}. Got ${a} which has type ${typeof a}.`);
  }
}
