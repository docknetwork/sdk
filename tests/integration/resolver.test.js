import {randomAsHex} from '@polkadot/util-crypto';
import {DockAPI} from '../../src/api';
import {createNewDockDID, createKeyDetail} from '../../src/utils/did';
import {getPublicKeyFromKeyringPair} from '../../src/utils/misc';
import {multiResolver, universalResolver, dockResolver} from '../../src/resolver';
import {NoDID} from '../../src/err';
import ethr from 'ethr-did-resolver';
import {parse as parse_did} from 'did-resolver';
import {FullNodeEndpoint, TestKeyringOpts, TestAccount} from '../test-constants';
import assert from 'assert';

async function createDockDID(dock) {


  const dockDID = createNewDockDID();
  const pair = dock.keyring.addFromUri(randomAsHex(32), null, 'sr25519');
  const publicKey = getPublicKeyFromKeyringPair(pair);
  const keyDetail = createKeyDetail(publicKey, dockDID);
  const transaction = dock.did.new(dockDID, keyDetail);
  await dock.sendTransaction(transaction);

  return dockDID;
}

// connect to a dock node, setup test account for extrinsic submission
async function connect(addr) {
  const dock = new DockAPI(addr);
  await dock.init({keyring: TestKeyringOpts});
  const account = dock.keyring.addFromUri(TestAccount.uri, TestAccount.options);
  dock.setAccount(account);
  return dock;
}

// check if two sets are equal
function setEqual(a, b) {
  console.log('fucj', a, b);
  return a.size === b.size && Array.from(a).every(e => b.has(e));
}

describe('Dock DID resolver', () => {
  let dock;
  let dockres;

  beforeAll(async done => {
    dock = await connect(FullNodeEndpoint);
    dockres = dockResolver(dock);
    done();
  });

  afterAll(async () => {
    await dock.disconnect();
  }, 30000);

  test('Can resolve a created dock did.', async () => {
    console.log(dock);

    const did = await createDockDID(dock);
    const doc = await dockres(did);

    // The following check assumes the did dock is simple json. DID documents are not meant to be
    // treated as json. They are RDF graphs serialized as json-ld. Processing them as json is only
    // correct for some representaions.
    //
    // For example, the three following json-ld documents are equavalent:
    //
    // ```json
    // {
    //   "@context": "https://www.w3.org/ns/did/v1",
    //   "created": "2019-01-17T16:49:32.018Z"
    // }
    // ```
    //
    // ```json
    // [
    //   {
    //     "@context": "https://www.w3.org/ns/did/v1",
    //     "created": "2019-01-17T16:49:32.018Z"
    //   }
    // ]
    // ```
    //
    // ```json
    // {
    //   "@context": "https://www.w3.org/ns/did/v1",
    //   "created": [
    //     "2019-01-17T16:49:32.018Z"
    //   ]
    // }
    // ```
    //
    // ```json
    // {
    //   "http://purl.org/dc/terms/created": {
    //     "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
    //     "@value": "2019-01-17T16:49:32.018Z"
    //   }
    // }
    // ```
    //
    // ```json
    // {
    //   "http://purl.org/dc/terms/created": {
    //     "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
    //     "@value": "2019-01-17T16:49:32.018Z"
    //   }
    // }
    // ```
    //
    // [DID context](https://www.w3.org/ns/did/v1)
    // [json-ld playground](https://json-ld.org/playground/#startTab=tab-expanded&json-ld=%7B%22%40context%22%3A%22https%3A%2F%2Fwww.w3.org%2Fns%2Fdid%2Fv1%22%2C%22created%22%3A%222019-01-17T16%3A49%3A32.018Z%22%7D&context=%7B%22%40context%22%3A%22http%3A%2F%2Fschema.org%2F%22%7D)
    //
    // This check is incomplete and incorrect but hopefully it can still catch bugs. Maybe in the
    // future we can use vc-js or similar to verify this is actually a valid json-ld DID document.
    expect(new Set(Object.keys(doc)))
      .toEqual(new Set(['@context', 'id', 'authentication', 'publicKey']));
    new URL(doc['@context']); // assert context is a valid url
    expect(doc['id']).toEqual(did);
  });

  test('Looking up an absent DID doc throws a NoDID error.', async () => {
    const unpublished = createNewDockDID();
    try {
      await dockres(unpublished);
      throw new Error("That last line should have failed.");
    } catch(e) {
      console.log('HEY', e);
      assert(e instanceof NoDID);
      assert.deepEqual(e.name, 'NoDID');
      assert.deepEqual(e.did, unpublished);
    }
  });
});
