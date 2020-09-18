import vc from 'vc-js';
import { expandedLogicProperty, acceptCompositeClaims, prove, validate } from '../../src/utils/cd';
import { Ed25519KeyPair, suites } from 'jsonld-signatures';
import axios from 'axios';
import contexts from '../../src/utils/vc/contexts';
import {
  EcdsaSepc256k1Signature2019, Ed25519Signature2018, Sr25519Signature2020,
} from '../../src/utils/vc/custom_crypto';
import { randomAsHex } from '@polkadot/util-crypto';

/// global document cache, acts as a did method for the tests below
let documentRegistry = {};
for (let [k, v] of contexts) {
  documentRegistry[k] = v;
}

describe('Composite claim soundness checker', () => {
  beforeAll(async (done) => {
    done();
  });

  test('control: issue and verify', async () => {
    let { did: issuer, suite: kp } = await newDid();

    let cred = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://www.w3.org/2018/credentials/examples/v1"
      ],
      "id": "https://example.com/credentials/1872",
      "type": ["VerifiableCredential", "AlumniCredential"],
      "issuer": issuer,
      "issuanceDate": "2010-01-01T19:23:24Z",
      "credentialSubject": {
        "id": "did:example:ebfeb1f712ebc6f1c276e12ec21",
        "alumniOf": "Example University"
      }
    };
    let credential = await vc.issue({
      credential: cred,
      suite: kp,
      documentLoader,
    });
    expect(await verifyC(credential))
      .toHaveProperty('verified', true);
    credential.issuanceDate = "9010-01-01T19:23:24Z";
    expect(await verifyC(credential))
      .toHaveProperty('verified', false);
  });

  test('behavior on empty input', () => {
    let premises = [];
    let to_prove = [];
    let rules = [];
    let proof = prove(premises, to_prove, rules);
    let valid = validate(rules, proof);
    expect(valid).toEqual({ assumed: [], implied: [] });
  });

  // // The claim graphs of credentials are combined in a safe manner; blank nodes from one credential
  // // must not be conflated with those from another. Depending on the claim graph representation,
  // // this may require renaming of blank nodes, or rejection of credential sets where blank node
  // // names are shared between credentials.
  // test('no blank_node conflations', () => {
  //   // Need to noodle on how/if this requirement can be tested.
  //   todo();
  // });

  // The user is able to input a set of credentials, along with an associated proof of composite
  // claim[s].
  //
  // The proof validator(DCK-70) correctly validates the proof.
  //
  // The verification result is provided to the user.
  //
  // The program reports all composite claims which were proven.
  test('end to end, presentation to result', async () => {
    let rules = sampleRules();
    let presentation = await validPresentation();
    presentation[expandedLogicProperty] = jsonLiteral(sampleProof());
    let all = await checkSoundness(presentation, rules);
    expect(all).toEqual([]); // will change to someting other than [] once things are working
  });

  // Soundness checking fails if and only if one of the following conditions occurs:
  // - Proof assumes claims not attested to by the provided credentials and is therefore not verifiable.
  // - Credential claims are not verifiable(credential verification fails) so proof is not verifiable.

  test('Proof including external claims should fail.', async () => {
    let rules = sampleRules();
    let presentation = await validPresentation();
    presentation[expandedLogicProperty] = jsonLiteral(invalidSampleProof());
    let err = await assertThrowsAsync(async () => { await checkSoundness(presentation, rules) });
    expect(err).toEqual("proof incudes ivalid application of rule");
  });

  test('Unverifiable credential should fail.', async () => {
    let rules = sampleRules();
    let presentation = await validPresentation();
    presentation.verifiableCredential[0].issuer = "did:dock:bobert"; // tamper
    presentation[expandedLogicProperty] = jsonLiteral(sampleProof());
    let err = await assertThrowsAsync(async () => { await checkSoundness(presentation, rules) });
    expect(err).toEqual("credential in presentation failed presentation");
  });
});

// takes a verifiable presentation and rules, returns all claims which are known to be true under
// the given set of rules
async function checkSoundness(presentation, rules) {
  // todo validate presentation
  return await acceptCompositeClaims(presentation, rules);
}

// run asyncronous function cb and return the error it throws
// if cb does not throw an error, this function will throw an error of it's own
async function assertThrowsAsync(cb) {
  try {
    await cb();
  } catch (e) {
    return e;
  }
  throw "expected error but no error was thrown";
}

/// create a fake document loader for did docs so we dont need to connect to a dev node
async function documentLoader(url) {
  if (documentRegistry[url] === undefined) {
    documentRegistry[url] = (await axios.get(url)).data;
  }
  return {
    documentUrl: url,
    document: documentRegistry[url],
  };
}

function registerDid(did, keyPair) {
  if (documentRegistry[did]) { throw `${did} already registered`; }
  let pk = {
    id: `${did}#keys-1`,
    type: keyPair.type,
    publicKeyBase58: keyPair.publicKeyBase58,
    controller: did,
  };
  let doc = {
    '@context': 'https://www.w3.org/ns/did/v1',
    id: did,
    authentication: [pk.id],
    assertionMethod: [pk.id],
    publicKey: [pk],
  };
  documentRegistry[did] = doc;
  documentRegistry[pk.id] = {
    '@context': 'https://www.w3.org/ns/did/v1',
    ...pk
  };
}

function randoDID() {
  return `did:dock:${randomAsHex(32)}`;
}

async function verifyC(credential) {
  return await vc.verifyCredential({
    credential,
    suite: [
      new Ed25519Signature2018(),
      new EcdsaSepc256k1Signature2019(),
      new Sr25519Signature2020()
    ],
    documentLoader
  });
}

async function verifyP(presentation) {
  return await vc.verify({
    presentation,
    suite: [
      new Ed25519Signature2018(),
      new EcdsaSepc256k1Signature2019(),
      new Sr25519Signature2020()
    ],
    documentLoader,
    unsignedPresentation: true,
  });
}

async function newDid() {
  let did = randoDID();
  let keypair = await Ed25519KeyPair.generate();
  registerDid(did, keypair);
  keypair.id = `${did}#keys-1`;
  keypair.controller = did;
  return {
    did,
    suite: new suites.Ed25519Signature2018({
      verificationMethod: keypair.id,
      key: keypair,
    })
  };
}

async function validCredential() {
  let { did: issuer, suite: kp } = await newDid();
  let cred = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://www.w3.org/2018/credentials/examples/v1"
    ],
    "id": "https://example.com/credentials/1872",
    "type": ["VerifiableCredential", "AlumniCredential"],
    "issuer": issuer,
    "issuanceDate": "2010-01-01T19:23:24Z",
    "credentialSubject": {
      "id": "did:example:ebfeb1f712ebc6f1c276e12ec21",
      "alumniOf": "Example University"
    }
  };
  let credential = await vc.issue({
    credential: cred,
    suite: kp,
    documentLoader,
  });
  expect(await verifyC(credential))
    .toHaveProperty('verified', true);
  return credential;
}

/// makes an unsigned presentation
async function validPresentation() {
  let creds = [await validCredential()];
  let { did: holder } = await newDid();
  let presentation = vc.createPresentation({
    verifiableCredential: creds, id: `urn:${randomAsHex(16)}`, holder
  });
  expect(await verifyP(presentation))
    .toHaveProperty('verified', true);
  return presentation;
}

// https://w3c.github.io/json-ld-syntax/#json-literals
function jsonLiteral(json) {
  return {
    "@type": "@json",
    "@value": JSON.parse(JSON.stringify(json))
  };
}

function sampleRules() {
  return [
    {
      if_all: [],
      then: [
        ["https://example.com/a", "https://example.com/frobs", "https://example.com/b"]
      ],
    }, {
      if_all: [
        [
          { Unbound: "pig" },
          { Bound: "https://example.com/Ability" },
          { Bound: "https://example.com/Flight" }
        ],
        [
          { Unbound: "pig" },
          { Bound: "https://www.w3.org/1999/02/22-rdf-syntax-ns#type" },
          { Bound: "https://example.com/Pig" }
        ],
      ],
      then: [
        // is this a valid way to encode a string literal?
        ["did:dock:bddap", "http://xmlns.com/foaf/spec/#term_firstName", "\"Gorgadon\""]
      ],
    }
  ];
}

function sampleProof() {
  return [{
    rule_index: 0,
    instantiations: [],
  }];
}

function invalidSampleProof() {
  return [{
    rule_index: 0,
    instantiations: ["hey"],
  }];
}
