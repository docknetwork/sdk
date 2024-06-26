import { randomAsHex } from '@polkadot/util-crypto';

import { DockAPI } from '../../../src';
import {
  NoDIDError,
  DidKeypair,
  DidMethodKey,
  DockDidOrDidMethodKey,
} from '../../../src/utils/did';
import {
  FullNodeEndpoint,
  TestKeyringOpts,
  TestAccountURI,
} from '../../test-constants';

describe('Basic DID tests', () => {
  const dock = new DockAPI();

  // Generate a random DID
  const testDidMethodKeySeed1 = randomAsHex(32);
  let testDidMethodKeyPair1;
  let testDidMethodKey1;

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
    testDidMethodKey1 = new DidMethodKey(testDidMethodKeyPair1.publicKey());

    testDidMethodKeyPair2 = DidKeypair.randomSecp256k1();
    testDidMethodKey2 = DidMethodKey.fromKeypair(testDidMethodKeyPair2);

    await dock.did.newDidMethodKey(testDidMethodKey1.asDidMethodKey, false);
  });

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);

  test('Can create a did:key', async () => {
    // DID does not exist
    await expect(
      dock.did.getDidMethodKeyDetail(testDidMethodKey2.asDidMethodKey),
    ).rejects.toThrow(NoDIDError);

    await dock.did.newDidMethodKey(testDidMethodKey2.asDidMethodKey, false);
    const { nonce } = await dock.did.getDidMethodKeyDetail(
      testDidMethodKey2.asDidMethodKey,
    );
    expect(nonce).toBeGreaterThan(1);
    expect(testDidMethodKey2.toString().startsWith('did:key:z')).toBe(true);
  }, 30000);

  test('Can attest with a DID', async () => {
    const priority = 1;
    const iri = 'my iri';

    await dock.did.setClaim(
      priority,
      iri,
      testDidMethodKey1,
      testDidMethodKeyPair1,
      undefined,
      false,
    );

    const att1 = await dock.did.getAttests(testDidMethodKey1);
    expect(att1).toEqual(iri);

    await dock.did.setClaim(
      priority,
      iri,
      testDidMethodKey2,
      testDidMethodKeyPair2,
      undefined,
      false,
    );

    const att2 = await dock.did.getAttests(testDidMethodKey2);
    expect(att2).toEqual(iri);
  }, 30000);

  test('Conversion works properly (including SS58 format)', () => {
    const substrateDid1 = dock.api.createType(
      'DidOrDidMethodKey',
      testDidMethodKey1,
    );
    expect(DockDidOrDidMethodKey.from(substrateDid1)).toEqual(
      testDidMethodKey1,
    );
    expect(testDidMethodKey1).toEqual(
      DockDidOrDidMethodKey.from(testDidMethodKey1),
    );

    const substrateDid2 = dock.api.createType(
      'DidOrDidMethodKey',
      testDidMethodKey2,
    );
    expect(DockDidOrDidMethodKey.from(substrateDid2)).toEqual(
      testDidMethodKey2,
    );
    expect(testDidMethodKey2).toEqual(
      DockDidOrDidMethodKey.from(testDidMethodKey2),
    );
  });
});
