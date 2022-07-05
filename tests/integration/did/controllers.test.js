import { randomAsHex } from '@polkadot/util-crypto';
import { DockAPI } from '../../../src';
import { createNewDockDID, getHexIdentifierFromDID, NoDIDError } from '../../../src/utils/did';
import { FullNodeEndpoint, TestAccountURI, TestKeyringOpts } from '../../test-constants';
import { getPublicKeyFromKeyringPair } from '../../../src/utils/misc';
import { DidKey, VerificationRelationship } from '../../../src/public-keys';

describe('DID controllers', () => {
  const dock = new DockAPI();

  const dockDid1 = createNewDockDID();
  const hexDid1 = getHexIdentifierFromDID(dockDid1);

  // This DID will be controlled by itself and dockDid1
  const dockDid2 = createNewDockDID();
  const hexDid2 = getHexIdentifierFromDID(dockDid2);

  // This DID will not control itself but will be controlled by dockDid1 and dockDid2
  const dockDid3 = createNewDockDID();
  const hexDid3 = getHexIdentifierFromDID(dockDid3);

  const seed1 = randomAsHex(32);
  const seed2 = randomAsHex(32);
  const seed3 = randomAsHex(32);
  const seed4 = randomAsHex(32);

  beforeAll(async (done) => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
    done();
  });

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);

  test('Create self controlled DIDs', async () => {
    const pair1 = dock.keyring.addFromUri(seed1);
    const publicKey1 = getPublicKeyFromKeyringPair(pair1);
    const verRels1 = new VerificationRelationship();
    const didKey1 = new DidKey(publicKey1, verRels1);
    await dock.did.new(dockDid1, [didKey1], [], false);

    const pair2 = dock.keyring.addFromUri(seed2);
    const publicKey2 = getPublicKeyFromKeyringPair(pair2);
    const verRels2 = new VerificationRelationship();
    const didKey2 = new DidKey(publicKey2, verRels2);
    await dock.did.new(dockDid2, [didKey2], [hexDid1], false);

    const didDetail1 = await dock.did.getOnchainDidDetail(hexDid1);
    expect(didDetail1.lastKeyId).toBe(1);
    expect(didDetail1.activeControllerKeys).toBe(1);
    expect(didDetail1.activeControllers).toBe(1);
    await expect(dock.did.isController(hexDid1, hexDid1)).resolves.toEqual(true);

    const didDetail2 = await dock.did.getOnchainDidDetail(hexDid2);
    expect(didDetail2.lastKeyId).toBe(1);
    expect(didDetail2.activeControllerKeys).toBe(1);
    expect(didDetail2.activeControllers).toBe(2);
    await expect(dock.did.isController(hexDid2, hexDid2)).resolves.toEqual(true);
    await expect(dock.did.isController(hexDid2, hexDid1)).resolves.toEqual(true);

    for (const [newSeed, signer, pair, keyCount] of [[seed3, hexDid1, pair1, 2], [seed4, hexDid2, pair2, 3]]) {
      const newPair = dock.keyring.addFromUri(newSeed);
      const publicKey = getPublicKeyFromKeyringPair(newPair);
      const verRels = new VerificationRelationship();
      verRels.setAssertion();
      const didKey = new DidKey(publicKey, verRels);

      const [addKeys, sig] = await dock.did.createSignedAddKeys([didKey], hexDid2, signer, pair, 1);
      await dock.did.addKeys(addKeys, sig);

      const didDetail = await dock.did.getOnchainDidDetail(hexDid2);
      expect(didDetail.lastKeyId).toBe(keyCount);
      expect(didDetail.activeControllerKeys).toBe(1);
      expect(didDetail.activeControllers).toBe(2);
    }
  }, 30000);

  test('Create DID controlled by other', async () => {
    await dock.did.new(dockDid3, [], [hexDid1], false);

    const didDetail1 = await dock.did.getOnchainDidDetail(hexDid3);
    expect(didDetail1.lastKeyId).toBe(0);
    expect(didDetail1.activeControllerKeys).toBe(0);
    expect(didDetail1.activeControllers).toBe(1);
    await expect(dock.did.isController(hexDid3, hexDid3)).resolves.toEqual(false);
    await expect(dock.did.isController(hexDid3, hexDid1)).resolves.toEqual(true);
  });

  test('Add keys and more controllers to a DID by its other controller', async () => {
    const pair1 = dock.keyring.addFromUri(seed1);

    // Add key to the DID using its controller
    const pair3 = dock.keyring.addFromUri(seed3);
    const publicKey1 = getPublicKeyFromKeyringPair(pair3);
    const verRels1 = new VerificationRelationship();
    verRels1.setAuthentication();
    const didKey3 = new DidKey(publicKey1, verRels1);

    const [addKeys, sig] = await dock.did.createSignedAddKeys([didKey3], hexDid3, hexDid1, pair1, 1);
    await dock.did.addKeys(addKeys, sig);

    let didDetail = await dock.did.getOnchainDidDetail(hexDid3);
    expect(didDetail.lastKeyId).toBe(1);
    expect(didDetail.activeControllerKeys).toBe(0);
    expect(didDetail.activeControllers).toBe(1);
    await expect(dock.did.isController(hexDid3, hexDid3)).resolves.toEqual(false);
    await expect(dock.did.isController(hexDid3, hexDid1)).resolves.toEqual(true);

    const dk1 = await dock.did.getDidKey(dockDid3, 1);
    expect(dk1.publicKey).toEqual(publicKey1);
    expect(dk1.verRels.isAuthentication()).toEqual(true);
    expect(dk1.verRels.isAssertion()).toEqual(false);
    expect(dk1.verRels.isCapabilityInvocation()).toEqual(false);
    expect(dk1.verRels.isKeyAgreement()).toEqual(false);

    // Add another controller to the DID using its existing controller
    const [addCnts, sig1] = await dock.did.createSignedAddControllers([hexDid2], hexDid3, hexDid1, pair1, 1);
    await dock.did.addControllers(addCnts, sig1);

    didDetail = await dock.did.getOnchainDidDetail(hexDid3);
    expect(didDetail.lastKeyId).toBe(1);
    expect(didDetail.activeControllerKeys).toBe(0);
    expect(didDetail.activeControllers).toBe(2);
    await expect(dock.did.isController(hexDid3, hexDid3)).resolves.toEqual(false);
    await expect(dock.did.isController(hexDid3, hexDid1)).resolves.toEqual(true);
    await expect(dock.did.isController(hexDid3, hexDid2)).resolves.toEqual(true);
  });

  test('Remove existing controllers from a DID by its controller', async () => {
    const pair2 = dock.keyring.addFromUri(seed2);
    const [remCnts, sig] = await dock.did.createSignedRemoveControllers([hexDid1], hexDid3, hexDid2, pair2, 1);
    await dock.did.removeControllers(remCnts, sig);

    const didDetail = await dock.did.getOnchainDidDetail(hexDid3);
    expect(didDetail.lastKeyId).toBe(1);
    expect(didDetail.activeControllerKeys).toBe(0);
    expect(didDetail.activeControllers).toBe(1);
    await expect(dock.did.isController(hexDid3, hexDid3)).resolves.toEqual(false);
    await expect(dock.did.isController(hexDid3, hexDid1)).resolves.toEqual(false);
    await expect(dock.did.isController(hexDid3, hexDid2)).resolves.toEqual(true);
  });

  test('Remove DID using its controller', async () => {
    const pair2 = dock.keyring.addFromUri(seed2);
    const [rem, sig] = await dock.did.createSignedDidRemoval(hexDid3, hexDid2, pair2, 1);
    await dock.did.remove(rem, sig);
    await expect(dock.did.getOnchainDidDetail(hexDid3)).rejects.toThrow(NoDIDError);
    await expect(dock.did.getDidKey(dockDid3, 1)).rejects.toThrow();
    await expect(dock.did.isController(hexDid3, hexDid2)).resolves.toEqual(false);
  });

  test('Add and remove multiple controllers', async () => {
    const pair1 = dock.keyring.addFromUri(seed1);
    const pair2 = dock.keyring.addFromUri(seed2);

    const dockDid4 = createNewDockDID();
    const hexDid4 = getHexIdentifierFromDID(dockDid4);

    const [addCnts, sig1] = await dock.did.createSignedAddControllers([hexDid3, hexDid4], hexDid2, hexDid1, pair1, 1);
    await dock.did.addControllers(addCnts, sig1);

    let didDetail = await dock.did.getOnchainDidDetail(hexDid2);
    expect(didDetail.activeControllers).toBe(4);
    await expect(dock.did.isController(hexDid2, hexDid1)).resolves.toEqual(true);
    await expect(dock.did.isController(hexDid2, hexDid2)).resolves.toEqual(true);
    await expect(dock.did.isController(hexDid2, hexDid3)).resolves.toEqual(true);
    await expect(dock.did.isController(hexDid2, hexDid4)).resolves.toEqual(true);

    const [remCnts, sig2] = await dock.did.createSignedRemoveControllers([hexDid1, hexDid3, hexDid4], hexDid2, hexDid2, pair2, 1);
    await dock.did.removeControllers(remCnts, sig2);
    didDetail = await dock.did.getOnchainDidDetail(hexDid2);
    expect(didDetail.activeControllers).toBe(1);
    await expect(dock.did.isController(hexDid2, hexDid1)).resolves.toEqual(false);
    await expect(dock.did.isController(hexDid2, hexDid2)).resolves.toEqual(true);
    await expect(dock.did.isController(hexDid2, hexDid3)).resolves.toEqual(false);
    await expect(dock.did.isController(hexDid2, hexDid4)).resolves.toEqual(false);
  });
});
