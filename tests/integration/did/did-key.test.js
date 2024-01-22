import { randomAsHex } from '@polkadot/util-crypto';

import { DockAPI } from '../../../src';
import { generateEcdsaSecp256k1Keypair } from '../../../src/utils/misc';
import {
  typedHexDID,
  typedHexDIDFromSubstrate,
  NoDIDError,
  DidKeypair,
  DockDidMethodKey,
} from '../../../src/utils/did';
import {
  FullNodeEndpoint,
  TestKeyringOpts,
  TestAccountURI,
  DisableDidKeyAndTrustRegistryTests,
} from '../../test-constants';

const buildTest = DisableDidKeyAndTrustRegistryTests ? describe.skip : describe;

buildTest('Basic DID tests', () => {
  const dock = new DockAPI();

  // Generate a random DID
  const testDidMethodKeySeed1 = randomAsHex(32);
  let testDidMethodKeyPair1;
  let testDidMethodKey1;

  const testDidMethodKeySeed2 = randomAsHex(32);
  let testDidMethodKeyPair2;
  let testDidMethodKey2;

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);

    testDidMethodKeyPair1 = new DidKeypair(
      dock.keyring.addFromUri(testDidMethodKeySeed1, null, 'ed25519'),
    );
    testDidMethodKey1 = new DockDidMethodKey(testDidMethodKeyPair1.publicKey());

    testDidMethodKeyPair2 = new DidKeypair(
      generateEcdsaSecp256k1Keypair(testDidMethodKeySeed2),
    );
    testDidMethodKey2 = new DockDidMethodKey(testDidMethodKeyPair2.publicKey());

    await dock.did.newDidMethodKey(testDidMethodKey1.asDidMethodKey, false);
  });

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);

  test('Can create a did:key', async () => {
    // DID does not exist
    await expect(dock.did.getDidMethodKeyDetail(testDidMethodKey2.asDidMethodKey)).rejects.toThrow(
      NoDIDError,
    );

    await dock.did.newDidMethodKey(testDidMethodKey2.asDidMethodKey, false);
    await dock.did.getDidMethodKeyDetail(testDidMethodKey2.asDidMethodKey);
  }, 30000);

  test('Can attest with a DID', async () => {
    const priority = 1;
    const iri = 'my iri';

    await dock.did.setClaim(priority, iri, testDidMethodKey1, testDidMethodKeyPair1, undefined, false);

    const att1 = await dock.did.getAttests(testDidMethodKey1);
    expect(att1).toEqual(iri);

    await dock.did.setClaim(priority, iri, testDidMethodKey2, testDidMethodKeyPair2, undefined, false);

    const att2 = await dock.did.getAttests(testDidMethodKey2);
    expect(att2).toEqual(iri);
  }, 30000);

  test('Conversion works properly (including SS58 format)', () => {
    const substrateDid1 = dock.api.createType('DidOrDidMethodKey', testDidMethodKey1);
    expect(typedHexDIDFromSubstrate(dock.api, substrateDid1)).toEqual(testDidMethodKey1);
    expect(testDidMethodKey1).toEqual(typedHexDID(dock.api, testDidMethodKey1));

    const substrateDid2 = dock.api.createType('DidOrDidMethodKey', testDidMethodKey2);
    expect(typedHexDIDFromSubstrate(dock.api, substrateDid2)).toEqual(testDidMethodKey2);
    expect(testDidMethodKey2).toEqual(typedHexDID(dock.api, testDidMethodKey2));
  });
});
