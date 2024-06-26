import { randomAsHex } from '@polkadot/util-crypto';
import { DockAPI } from '../../../src';
import { DockDid, NoDIDError, DidKeypair } from '../../../src/utils/did';
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
} from '../../test-constants';
import { getPublicKeyFromKeyringPair } from '../../../src/utils/misc';
import { DidKey, VerificationRelationship } from '../../../src/public-keys';
import { checkVerificationMethods } from '../helpers';

describe('DID controllers', () => {
  const dock = new DockAPI();

  const dockDid1 = DockDid.random();
  let hexDid1;

  // This DID will be controlled by itself and dockDid1
  const dockDid2 = DockDid.random();
  let hexDid2;

  // This DID will not control itself but will be controlled by dockDid1 and dockDid2
  const dockDid3 = DockDid.random();
  let hexDid3;

  const seed1 = randomAsHex(32);
  const seed2 = randomAsHex(32);
  const seed3 = randomAsHex(32);
  const seed4 = randomAsHex(32);

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);

    hexDid1 = DockDid.from(dockDid1);
    hexDid2 = DockDid.from(dockDid2);
    hexDid3 = DockDid.from(dockDid3);
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
    await dock.did.new(dockDid2, [didKey2], [dockDid1], false);

    const didDetail1 = await dock.did.getOnchainDidDetail(hexDid1.asDid);
    expect(didDetail1.lastKeyId).toBe(1);
    expect(didDetail1.activeControllerKeys).toBe(1);
    expect(didDetail1.activeControllers).toBe(1);
    await expect(dock.did.isController(dockDid1, dockDid1)).resolves.toEqual(
      true,
    );

    const didDetail2 = await dock.did.getOnchainDidDetail(hexDid2.asDid);
    expect(didDetail2.lastKeyId).toBe(1);
    expect(didDetail2.activeControllerKeys).toBe(1);
    expect(didDetail2.activeControllers).toBe(2);
    await expect(dock.did.isController(dockDid2, dockDid2)).resolves.toEqual(
      true,
    );
    await expect(dock.did.isController(dockDid2, dockDid1)).resolves.toEqual(
      true,
    );

    for (const [newSeed, signer, pair, keyCount] of [
      [seed3, dockDid1, pair1, 2],
      [seed4, dockDid2, pair2, 3],
    ]) {
      const newPair = dock.keyring.addFromUri(newSeed);
      const publicKey = getPublicKeyFromKeyringPair(newPair);
      const verRels = new VerificationRelationship();
      verRels.setAssertion();
      const didKey = new DidKey(publicKey, verRels);

      await dock.did.addKeys(
        [didKey],
        dockDid2,
        signer,
        new DidKeypair(pair, 1),
      );
      const didDetail = await dock.did.getOnchainDidDetail(hexDid2.asDid);
      expect(didDetail.lastKeyId).toBe(keyCount);
      expect(didDetail.activeControllerKeys).toBe(1);
      expect(didDetail.activeControllers).toBe(2);
    }
  }, 60000);

  test('Get DID documents', async () => {
    const doc1 = await dock.did.getDocument(dockDid1);
    expect(doc1.controller.length).toEqual(1);

    checkVerificationMethods(dockDid1, doc1, 1, 0);

    expect(doc1.authentication.length).toEqual(1);
    expect(doc1.authentication[0]).toEqual(`${dockDid1}#keys-1`);
    expect(doc1.assertionMethod.length).toEqual(1);
    expect(doc1.assertionMethod[0]).toEqual(`${dockDid1}#keys-1`);
    expect(doc1.capabilityInvocation.length).toEqual(1);
    expect(doc1.capabilityInvocation[0]).toEqual(`${dockDid1}#keys-1`);

    const doc2 = await dock.did.getDocument(dockDid2);
    expect(doc2.controller.length).toEqual(2);

    checkVerificationMethods(dockDid2, doc2, 3, 0);
    checkVerificationMethods(dockDid2, doc2, 3, 1);
    checkVerificationMethods(dockDid2, doc2, 3, 2);

    expect(doc2.authentication.length).toEqual(1);
    expect(doc2.authentication[0]).toEqual(`${dockDid2}#keys-1`);
    expect(doc2.assertionMethod.length).toEqual(3);
    expect(doc2.assertionMethod[0]).toEqual(`${dockDid2}#keys-1`);
    expect(doc2.assertionMethod[1]).toEqual(`${dockDid2}#keys-2`);
    expect(doc2.assertionMethod[2]).toEqual(`${dockDid2}#keys-3`);
    expect(doc2.capabilityInvocation.length).toEqual(1);
    expect(doc2.capabilityInvocation[0]).toEqual(`${dockDid2}#keys-1`);
  }, 10000);

  test('Create DID controlled by other', async () => {
    await dock.did.new(dockDid3, [], [dockDid1], false);

    const didDetail1 = await dock.did.getOnchainDidDetail(hexDid3.asDid);
    expect(didDetail1.lastKeyId).toBe(0);
    expect(didDetail1.activeControllerKeys).toBe(0);
    expect(didDetail1.activeControllers).toBe(1);
    await expect(dock.did.isController(dockDid3, dockDid3)).resolves.toEqual(
      false,
    );
    await expect(dock.did.isController(dockDid3, dockDid1)).resolves.toEqual(
      true,
    );
  });

  test('Get DID document', async () => {
    const doc3 = await dock.did.getDocument(dockDid3);
    expect(doc3.controller.length).toEqual(1);
    checkVerificationMethods(dockDid3, doc3, 0);
    expect(doc3.authentication).not.toBeDefined();
    expect(doc3.assertionMethod).not.toBeDefined();
    expect(doc3.capabilityInvocation).not.toBeDefined();
  }, 10000);

  test('Add keys and more controllers to a DID by its other controller', async () => {
    const pair1 = new DidKeypair(dock.keyring.addFromUri(seed1), 1);

    // Add key to the DID using its controller
    const pair3 = dock.keyring.addFromUri(seed3);
    const publicKey1 = getPublicKeyFromKeyringPair(pair3);
    const verRels1 = new VerificationRelationship();
    verRels1.setAuthentication();
    const didKey3 = new DidKey(publicKey1, verRels1);

    await dock.did.addKeys([didKey3], dockDid3, dockDid1, pair1);

    let didDetail = await dock.did.getOnchainDidDetail(hexDid3.asDid);
    expect(didDetail.lastKeyId).toBe(1);
    expect(didDetail.activeControllerKeys).toBe(0);
    expect(didDetail.activeControllers).toBe(1);
    await expect(dock.did.isController(dockDid3, dockDid3)).resolves.toEqual(
      false,
    );
    await expect(dock.did.isController(dockDid3, dockDid1)).resolves.toEqual(
      true,
    );

    const dk1 = await dock.did.getDidKey(dockDid3, 1);
    expect(dk1.publicKey).toEqual(publicKey1);
    expect(dk1.verRels.isAuthentication()).toEqual(true);
    expect(dk1.verRels.isAssertion()).toEqual(false);
    expect(dk1.verRels.isCapabilityInvocation()).toEqual(false);
    expect(dk1.verRels.isKeyAgreement()).toEqual(false);

    // Add another controller to the DID using its existing controller
    await dock.did.addControllers([dockDid2], dockDid3, dockDid1, pair1);

    didDetail = await dock.did.getOnchainDidDetail(hexDid3.asDid);
    expect(didDetail.lastKeyId).toBe(1);
    expect(didDetail.activeControllerKeys).toBe(0);
    expect(didDetail.activeControllers).toBe(2);
    await expect(dock.did.isController(dockDid3, dockDid3)).resolves.toEqual(
      false,
    );
    await expect(dock.did.isController(dockDid3, dockDid1)).resolves.toEqual(
      true,
    );
    await expect(dock.did.isController(dockDid3, dockDid2)).resolves.toEqual(
      true,
    );
  });

  test('Get DID document after update', async () => {
    const doc3 = await dock.did.getDocument(dockDid3);
    expect(doc3.controller.length).toEqual(2);
    // expect(doc3.verificationMethod.length).toEqual(1);
    checkVerificationMethods(dockDid3, doc3, 1, 0);
    expect(doc3.authentication.length).toEqual(1);
    expect(doc3.authentication[0]).toEqual(`${dockDid3}#keys-1`);
    expect(doc3.assertionMethod).not.toBeDefined();
    expect(doc3.capabilityInvocation).not.toBeDefined();
  }, 10000);

  test('Remove existing controllers from a DID by its controller', async () => {
    const pair2 = new DidKeypair(dock.keyring.addFromUri(seed2), 1);
    await dock.did.removeControllers([dockDid1], dockDid3, dockDid2, pair2);

    const didDetail = await dock.did.getOnchainDidDetail(hexDid3.asDid);
    expect(didDetail.lastKeyId).toBe(1);
    expect(didDetail.activeControllerKeys).toBe(0);
    expect(didDetail.activeControllers).toBe(1);
    await expect(dock.did.isController(dockDid3, dockDid3)).resolves.toEqual(
      false,
    );
    await expect(dock.did.isController(dockDid3, dockDid1)).resolves.toEqual(
      false,
    );
    await expect(dock.did.isController(dockDid3, dockDid2)).resolves.toEqual(
      true,
    );
  });

  test('Remove DID using its controller', async () => {
    const pair2 = new DidKeypair(dock.keyring.addFromUri(seed2), 1);
    await dock.did.remove(dockDid3, dockDid2, pair2);
    await expect(dock.did.getDocument(dockDid3)).rejects.toThrow(NoDIDError);
    await expect(dock.did.getOnchainDidDetail(hexDid3.asDid)).rejects.toThrow(
      NoDIDError,
    );
    await expect(dock.did.getDidKey(dockDid3, 1)).rejects.toThrow();
    await expect(dock.did.isController(dockDid3, dockDid2)).resolves.toEqual(
      false,
    );
  });

  test('Add and remove multiple controllers', async () => {
    const pair1 = new DidKeypair(dock.keyring.addFromUri(seed1), 1);
    const pair2 = new DidKeypair(dock.keyring.addFromUri(seed2), 1);

    const dockDid4 = DockDid.random();

    await dock.did.addControllers(
      [dockDid3, dockDid4],
      dockDid2,
      dockDid1,
      pair1,
    );

    let didDetail = await dock.did.getOnchainDidDetail(hexDid2.asDid);
    expect(didDetail.activeControllers).toBe(4);
    await expect(dock.did.isController(dockDid2, dockDid1)).resolves.toEqual(
      true,
    );
    await expect(dock.did.isController(dockDid2, dockDid2)).resolves.toEqual(
      true,
    );
    await expect(dock.did.isController(dockDid2, dockDid3)).resolves.toEqual(
      true,
    );
    await expect(dock.did.isController(dockDid2, dockDid4)).resolves.toEqual(
      true,
    );

    await dock.did.removeControllers(
      [dockDid1, dockDid3, dockDid4],
      dockDid2,
      dockDid2,
      pair2,
    );
    didDetail = await dock.did.getOnchainDidDetail(hexDid2.asDid);
    expect(didDetail.activeControllers).toBe(1);
    await expect(dock.did.isController(dockDid2, dockDid1)).resolves.toEqual(
      false,
    );
    await expect(dock.did.isController(dockDid2, dockDid2)).resolves.toEqual(
      true,
    );
    await expect(dock.did.isController(dockDid2, dockDid3)).resolves.toEqual(
      false,
    );
    await expect(dock.did.isController(dockDid2, dockDid4)).resolves.toEqual(
      false,
    );
  });
});
