import { extendContextLoader } from 'jsonld-signatures';
import vc from 'vc-js';
import { acceptCompositeClaims } from '../../src/utils/cd';
import { Ed25519KeyPair, suites } from 'jsonld-signatures';
const { defaultDocumentLoader } = vc;
import axios from 'axios';
import contexts from '../../src/utils/vc/contexts';

describe('Composite claim soundness checker', () => {
  let issuer1 = 'did:dock:fake';
  let issuer1Suite;
  let documentLoader;

  beforeAll(async (done) => {
    let issuer1Keypair = await Ed25519KeyPair.generate();

    let offlineDocs = {};
    offlineDocs[issuer1] = fakeDidDock(issuer1, issuer1Keypair);
    for (let [k, v] of contexts) {
      offlineDocs[k] = v;
    }
    documentLoader = offlineLoader(offlineDocs);

    issuer1Keypair.id = `${issuer1}#keys-1`;
    issuer1Keypair.controller = issuer1;
    issuer1Suite = new suites.Ed25519Signature2018({
      verificationMethod: issuer1Keypair.id,
      key: issuer1Keypair
    });

    done();
  });

  test('control: issue and verify', async () => {
    let credential = await aCredential(
      issuer1Suite,
      documentLoader,
    );
    let v = await vc.verifyCredential({
      credential,
      suite: issuer1Suite,
      documentLoader,
    });
    expect(v.verified).toBe(true);
    // TODO, check against an invalid credential and ensure false
  });

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

  test('Proof including external claims should fail.', async () => {
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

// takes a verifiable presentation and rules, returns all claims which are known to be true under
// the given set of rules
async function check_soundness(_dock, _presentation, _rules) {
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

function aPresentation() {
  todo();
}

async function aCredential(
  suite,
  documentLoader,
  credential = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://www.w3.org/2018/credentials/examples/v1"
    ],
    "id": "https://example.com/credentials/1872",
    "type": ["VerifiableCredential", "AlumniCredential"],
    "issuer": "did:dock:fake",
    "issuanceDate": "2010-01-01T19:23:24Z",
    "credentialSubject": {
      "id": "did:example:ebfeb1f712ebc6f1c276e12ec21",
      "alumniOf": "Example University"
    }
  }
) {
  let ret = await vc.issue({ credential, suite, documentLoader });
  return ret;
}

/// create a fake document loader for did docs so we dont need to connect to a dev node
function offlineLoader(dict) {
  return async url => {
    const document = dict[url] ? dict[url] : (await axios.get(url)).data;
    dict[url] = document; // cache the result
    return {
      documentUrl: url,
      document: dict[url],
    };
  };
}

function fakeDidDock(did, keyPair) {
  let pk = { ...keyPair };
  pk.id = `${did}#keys-1`;
  pk.controller = did;
  delete pk.privateKey;
  return {
    '@context': 'https://www.w3.org/ns/did/v1',
    id: did,
    authentication: [pk.id],
    assertionMethod: [pk.id],
    publicKey: [pk],
  };
}
