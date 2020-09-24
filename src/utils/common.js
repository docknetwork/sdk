// Helpers for internal use by sdk utilities.
// The api of this module is not guaranteed to be stable
// and may change.

// deep copy a json serializable object
export function deepClone(obj) {
  // https://jsben.ch/E55IQ
  return JSON.parse(JSON.stringify(obj));
}

export function assertValidClaimGraph(cg) {
  for (let claim of cg) {
    for (let node of claim) {
      assertValidNode(node);
    }
  }
}

export function assertValidNode(node) {
  let ks = Object.keys(node);
  assert(ks.length === 1, 'enum representaion invalid. enum must be exactly one variant');
  let tag = ks[0];
  let value = node[tag];
  switch (tag) {
    case 'Iri':
      assertType(value, 'string');
      break;
    case 'Blank':
      assertType(value, 'string');
      break;
    case 'Literal':
      assertType(value, 'object');
      assert(Object.keys(value).length == 2);
      assertType(value.value, 'string');
      assertType(value.datatype, 'string');
      break;
    default:
      throw 'Bad node tag: ' + tag;
  }
}

export function assertType(a, typ) {
  if (typeof a !== typ) {
    throw `Type error. Expected type ${typ}. Got ${a} which has type ${typeof a}.`;
  }
}

export function assert(b, s) {
  if (!b) {
    let m = 'assertion failed';
    if (s !== undefined) {
      m += ' ' + s;
    }
    throw m;
  }
}
