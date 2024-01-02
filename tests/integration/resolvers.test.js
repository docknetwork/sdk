import { randomAsHex } from '@polkadot/util-crypto';
import { DockResolver, DockStatusList2021Resolver } from '../../src/resolver';
import { createNewDockDID, DidKeypair } from '../../src/utils/did';

import { DockAPI } from '../../src/index';

import {
  FullNodeEndpoint,
  TestKeyringOpts,
  TestAccountURI,
  DisableStatusListTests,
} from '../test-constants';

import { OneOfPolicy } from '../../src/utils/revocation';
import { registerNewDIDUsingPair } from './helpers';
import { getKeyDoc } from '../../src/utils/vc/helpers';
import StatusList2021Credential from '../../src/status-list-credential/status-list2021-credential';
import dockDidResolver from '../../src/resolver/did/dock-did-resolver';

describe('Resolvers', () => {
  const dock = new DockAPI();
  let pair;

  // Create a random status list id
  const statusListCredId = randomAsHex(32);
  let statusListCred;

  // Create a new owner DID, the DID will be registered on the network and own the status list
  const ownerDID = createNewDockDID();
  const ownerSeed = randomAsHex(32);
  let ownerKey;

  // Create  owners
  const owners = new Set();
  owners.add(ownerDID);

  // Create a status list policy
  const policy = new OneOfPolicy(owners);

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });

    ownerKey = getKeyDoc(
      ownerDID,
      dock.keyring.addFromUri(ownerSeed, null, 'ed25519'),
      'Ed25519VerificationKey2018',
    );

    // The keyring should be initialized before any test begins as this suite is testing statusListCredentialModule
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);

    // Thees DIDs should be written before any test begins
    pair = DidKeypair.fromApi(dock, { seed: ownerSeed, keypairType: 'sr25519' });

    // The controller is same as the DID
    await registerNewDIDUsingPair(dock, ownerDID, pair);

    if (!DisableStatusListTests) {
      statusListCred = await StatusList2021Credential.create(
        ownerKey,
        statusListCredId,
      );
      await expect(
        dock.statusListCredential.createStatusListCredential(
          statusListCredId,
          statusListCred,
          policy,
          false,
        ),
      ).resolves.toBeDefined();
    }
  }, 40000);

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);

  it('checks `DockResolver`', async () => {
    const resolver = new DockResolver(dock);

    expect(resolver.supports('did:dock:')).toBe(true);
    expect(resolver.supports('did:doc:')).toBe(false);
    expect(resolver.supports('status-list2021:dock:')).toBe(true);
    expect(resolver.supports('status-list2021:*:')).toBe(false);
    expect(resolver.supports('status-list2020:doc:')).toBe(false);
    expect(await resolver.resolve(ownerDID)).toEqual(
      await dock.did.getDocument(ownerDID),
    );
    if (!DisableStatusListTests) {
      expect(await resolver.resolve(statusListCred.id)).toEqual(
        statusListCred.toJSON(),
      );
    }
  });

  it('checks `DockStatusList2021Resolver`', async () => {
    if (DisableStatusListTests) return;

    const resolver = new DockStatusList2021Resolver(dock);

    expect(resolver.supports('did:dock:')).toBe(false);
    expect(resolver.supports('did:doc:')).toBe(false);
    expect(resolver.supports('status-list2021:dock:')).toBe(true);
    expect(resolver.supports('status-list2021:*:')).toBe(false);
    expect(resolver.supports('status-list2020:doc:')).toBe(false);
    expect(resolver.resolve(ownerDID)).rejects.toThrowError(
      `Invalid \`StatusList2021Credential\` id: \`${ownerDID}\``,
    );
    expect(await resolver.resolve(statusListCred.id)).toEqual(
      statusListCred.toJSON(),
    );
  });

  it('checks `DockDidResolver`', async () => {
    const resolver = new dockDidResolver(dock);

    expect(resolver.supports('did:dock:')).toBe(true);
    expect(resolver.supports('did:doc:')).toBe(false);
    expect(resolver.supports('status-list2021:dock:')).toBe(false);
    expect(resolver.supports('status-list2021:*:')).toBe(false);
    expect(resolver.supports('status-list2020:doc:')).toBe(false);
    expect(await resolver.resolve(ownerDID)).toEqual(
      await dock.did.getDocument(ownerDID),
    );
    if (!DisableStatusListTests) {
      expect(resolver.resolve(statusListCred.id)).rejects.toThrowError(
        `Invalid DID: \`${statusListCred.id}\``,
      );
    }
  });
});
