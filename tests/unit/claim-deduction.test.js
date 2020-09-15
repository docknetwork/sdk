describe('Composite claim soundness checker', () => {
  let dock;

  test('behavior on empty input', () => {
    let premises = [];
    let to_prove = [];
    let rules = [];
    let proof = prove(premises, to_prove, rules);
    let valid = validate(rules, proof);
    expect(valid).toEqual({ assumed: [], implied: [] });
  });

  // The claim graphs of credentials are combined in a safe manner; blank nodes from one credential
  // must not be conflated with those from another. Depending on the claim graph representation,
  // this may require renaming of blank nodes, or rejection of credential sets where blank node
  // names are shared between credentials.
  test('no blank_node conflations', () => {
    // Need to noodle on how/if this requirement can be tested.
    todo();
  });

  // The user is able to input a set of credentials, along with an associated proof of composite
  // claim[s].
  //
  // The proof validator(DCK-70) correctly validates the proof.
  //
  // The verification result is provided to the user.
  //
  // The program reports all composite claims which were proven.
  test('end to end, presentation to result', () => {
    let presentation;
    let rules;
    let all = verify_all(dock, presentation, rules);
    expect(all).toEqual([]);
    todo();
  });

  // Soundness checking fails if and only if one of the following conditions occurs:
  // - Proof assumes claims not attested to by the provided credentials and is therefore not verifiable.
  // - Credential claims are not verifiable(credential verification fails) so proof is not verifiable.

  test('Proof including external claims should fail.', () => {
    let funky_proof_presentaion = {};
    let rules = [{
      if_all: [[{ Bound: "a" }, { Bound: "a" }, { Bound: "a" }]],
      then: [[{ Bound: "b" }, { Bound: "b" }, { Bound: "b" }]],
    }];
    let err = error_when(() => verify_all(dock, funky_proof_presentaion, rules));
    expect(err).toEqual("proof assumes unverifiable claims"); // or something
  });

  test('Unverifiable credential should fail.', () => {
    todo();
  });
});

// dummy function
function prove(
  _premises,
  _to_prove,
  _rules,
) {
  return [];
}

// dummy function
function validate(_rules, _proof) {
  return {
    assumed: [],
    implied: [],
  };
}

// takes a verifiable presentation and rules, returns all claims which are known to be true under
// the given set of rules
function verify_all(_dock, _presentation, _rules) {
  return [];
}

function todo() {
  throw "TODO!";
}

// run cb and return the error it throws
// if cb does not throw an error, this function will throw an error of it's own
function error_when(cb) {
  try {
    cb();
  } catch (e) {
    return e;
  }
  throw "expected error but no error was thrown";
}
