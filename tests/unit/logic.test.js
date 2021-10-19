import jsonld from 'jsonld';
import { randomAsHex } from '@polkadot/util-crypto';
import { presentationToEEClaimGraph, proveh } from '../../src/utils/cd';
import { documentLoader } from '../cached-document-loader.js';
import {
  ANYCLAIM, MAYCLAIM, MAYCLAIM_DEF_1, MAYCLAIM_DEF_2,
} from '../../src/rdf-defs';

const COOLNESS = 'https://example.com/coolnessLevel';

describe('logic', () => {
  test('delegation chain', async () => {
    const cred = {
      '@context': 'https://www.w3.org/2018/credentials/v1',
      type: 'VerifiableCredential',
      issuer: 'did:example:c',
      credentialSubject: {
        id: 'did:example:d',
        [COOLNESS]: 1,
      },
    };

    const del1 = {
      '@context': 'https://www.w3.org/2018/credentials/v1',
      type: 'VerifiableCredential',
      issuer: 'did:example:a',
      credentialSubject: {
        id: 'did:example:b',
        [MAYCLAIM]: { '@id': ANYCLAIM },
      },
    };

    const del2 = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
      ],
      type: 'VerifiableCredential',
      issuer: 'did:example:b',
      credentialSubject: {
        id: 'did:example:c',
        [MAYCLAIM]: { '@id': ANYCLAIM },
      },
    };

    const to_prove = [[
      { Iri: 'did:example:d' },
      { Iri: COOLNESS },
      { Literal: { datatype: 'http://www.w3.org/2001/XMLSchema#integer', value: '1' } },
      { DefaultGraph: true },
    ]];

    // Manually grant 'did:example:a' authority to make claims. This makes 'did:example:a' a root authority.
    const assumed = [[
      { Iri: 'did:example:a' },
      { Iri: MAYCLAIM },
      { Iri: ANYCLAIM },
      { DefaultGraph: true },
    ]];

    let cg;

    // happy path
    cg = cat(await asCg([cred, del1, del2]), assumed);
    proveh(cg, to_prove, MAYCLAIM_DEF_1);
    proveh(cg, to_prove, MAYCLAIM_DEF_2);

    // the assumption assigning a root authority is not included in the claimgraph
    cg = await asCg([cred, del1, del2]);
    assert_error(
      () => proveh(cg, to_prove, MAYCLAIM_DEF_1),
      { CantProve: 'NovelName' },
    );
    assert_error(
      () => proveh(cg, to_prove, MAYCLAIM_DEF_2),
      { CantProve: 'ExhaustedSearchSpace' },
    );

    // a link in the delegation chain is broken
    cg = cat(await asCg([cred, del1]), assumed);
    assert_error(
      () => proveh(cg, to_prove, MAYCLAIM_DEF_1),
      { CantProve: 'ExhaustedSearchSpace' },
    );
    assert_error(
      () => proveh(cg, to_prove, MAYCLAIM_DEF_2),
      { CantProve: 'ExhaustedSearchSpace' },
    );
  });
});

// bundle a list of creds into a presentation
// return the bundle as a claimgraph as if the presentation were verified
async function asCg(creds) {
  const exp = await expand(present(creds));
  return await presentationToEEClaimGraph(exp);
}

async function expand(jld) {
  return await jsonld.expand(jld, { documentLoader });
}

function assert_error(cb, expected_error) {
  try {
    cb();
  } catch (err) {
    expect(err).toEqual(expected_error);
  }
}

function present(creds) {
  return {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
    ],
    '@type': ['VerifiablePresentation'],
    id: `urn:${randomAsHex(16)}`,
    holder: `urn:${randomAsHex(16)}`,
    verifiableCredential: creds,
  };
}

function cat(...arrays) {
  let ret = [];
  for (const array of arrays) {
    ret = ret.concat(array);
  }
  return ret;
}
