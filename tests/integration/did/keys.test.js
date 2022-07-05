import { randomAsHex } from '@polkadot/util-crypto';
import { BTreeSet } from '@polkadot/types';
import { DockAPI, PublicKeySecp256k1 } from '../../../src';
import { createNewDockDID, getHexIdentifierFromDID } from '../../../src/utils/did';
import { FullNodeEndpoint, TestAccountURI, TestKeyringOpts } from '../../test-constants';
import { generateEcdsaSecp256k1Keypair, getPublicKeyFromKeyringPair } from '../../../src/utils/misc';
import { DidKey, VerificationRelationship } from '../../../src/public-keys';

describe('Key support for DIDs', () => {
  const dock = new DockAPI();

  // Generate a random DID
  const dockDid = createNewDockDID();
  const hexDid = getHexIdentifierFromDID(dockDid);

  const seed1 = randomAsHex(32);
  const seed2 = randomAsHex(32);
  const seed3 = randomAsHex(32);
  const seed4 = randomAsHex(32);
  const seed6 = randomAsHex(32);
  const seed5 = randomAsHex(32);

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

  test('Create a DID with many keys', async () => {
    const pair1 = dock.keyring.addFromUri(seed1);
    const publicKey1 = getPublicKeyFromKeyringPair(pair1);
    const verRels1 = new VerificationRelationship();
    const didKey1 = new DidKey(publicKey1, verRels1);

    const pair2 = dock.keyring.addFromUri(seed2, null, 'ed25519');
    const publicKey2 = getPublicKeyFromKeyringPair(pair2);
    const verRels2 = new VerificationRelationship();
    const didKey2 = new DidKey(publicKey2, verRels2);

    const pair3 = dock.keyring.addFromUri(seed3, null, 'ed25519');
    const publicKey3 = getPublicKeyFromKeyringPair(pair3);
    const verRels3 = new VerificationRelationship();
    verRels3.setAssertion();
    const didKey3 = new DidKey(publicKey3, verRels3);

    await dock.did.new(dockDid, [didKey1, didKey2, didKey3], [], false);

    const didDetail = await dock.did.getOnchainDidDetail(hexDid);
    expect(didDetail.lastKeyId).toBe(3);
    expect(didDetail.activeControllerKeys).toBe(2);
    expect(didDetail.activeControllers).toBe(1);
    await expect(dock.did.isController(hexDid, hexDid)).resolves.toEqual(true);

    for (const [i, pk] of [[1, publicKey1], [2, publicKey2]]) {
      // eslint-disable-next-line no-await-in-loop
      const dk = await dock.did.getDidKey(dockDid, i);
      expect(dk.publicKey).toEqual(pk);
      expect(dk.verRels.isAuthentication()).toEqual(true);
      expect(dk.verRels.isAssertion()).toEqual(true);
      expect(dk.verRels.isCapabilityInvocation()).toEqual(true);
      expect(dk.verRels.isKeyAgreement()).toEqual(false);
    }

    const dk = await dock.did.getDidKey(dockDid, 3);
    expect(dk.publicKey).toEqual(publicKey3);
    expect(dk.verRels.isAuthentication()).toEqual(false);
    expect(dk.verRels.isAssertion()).toEqual(true);
    expect(dk.verRels.isCapabilityInvocation()).toEqual(false);
    expect(dk.verRels.isKeyAgreement()).toEqual(false);
  });

  test('Add more keys to DID', async () => {
    const pair1 = generateEcdsaSecp256k1Keypair(seed4);
    const publicKey1 = PublicKeySecp256k1.fromKeyringPair(pair1);
    const verRels1 = new VerificationRelationship();
    verRels1.setCapabilityInvocation();
    verRels1.setAssertion();
    const didKey1 = new DidKey(publicKey1, verRels1);

    const pair = dock.keyring.addFromUri(seed2, null, 'ed25519');
    const [addKeys, sig] = await dock.did.createSignedAddKeys([didKey1], hexDid, hexDid, pair, 2);
    await dock.did.addKeys(addKeys, sig);

    const didDetail = await dock.did.getOnchainDidDetail(hexDid);
    expect(didDetail.lastKeyId).toBe(4);
    expect(didDetail.activeControllerKeys).toBe(3);
    expect(didDetail.activeControllers).toBe(1);

    const dk1 = await dock.did.getDidKey(dockDid, 4);
    expect(dk1.publicKey).toEqual(publicKey1);
    expect(dk1.verRels.isAuthentication()).toEqual(false);
    expect(dk1.verRels.isAssertion()).toEqual(true);
    expect(dk1.verRels.isCapabilityInvocation()).toEqual(true);
    expect(dk1.verRels.isKeyAgreement()).toEqual(false);
  });

  test('Remove keys from DID', async () => {
    const pair = generateEcdsaSecp256k1Keypair(seed4);
    const [removeKeys, sig] = await dock.did.createSignedRemoveKeys([1, 3], hexDid, hexDid, pair, 4);
    await dock.did.removeKeys(removeKeys, sig);

    const didDetail = await dock.did.getOnchainDidDetail(hexDid);
    expect(didDetail.lastKeyId).toBe(4);
    expect(didDetail.activeControllerKeys).toBe(2);
    expect(didDetail.activeControllers).toBe(1);

    await expect(dock.did.getDidKey(dockDid, 1)).rejects.toThrow();
    await expect(dock.did.getDidKey(dockDid, 3)).rejects.toThrow();

    const pair2 = dock.keyring.addFromUri(seed2, null, 'ed25519');
    const publicKey2 = getPublicKeyFromKeyringPair(pair2);
    const dk2 = await dock.did.getDidKey(dockDid, 2);
    expect(dk2.publicKey).toEqual(publicKey2);
    expect(dk2.verRels.isAuthentication()).toEqual(true);
    expect(dk2.verRels.isAssertion()).toEqual(true);
    expect(dk2.verRels.isCapabilityInvocation()).toEqual(true);
    expect(dk2.verRels.isKeyAgreement()).toEqual(false);

    const pair4 = generateEcdsaSecp256k1Keypair(seed4);
    const publicKey4 = PublicKeySecp256k1.fromKeyringPair(pair4);
    const dk4 = await dock.did.getDidKey(dockDid, 4);
    expect(dk4.publicKey).toEqual(publicKey4);
    expect(dk4.verRels.isAuthentication()).toEqual(false);
    expect(dk4.verRels.isAssertion()).toEqual(true);
    expect(dk4.verRels.isCapabilityInvocation()).toEqual(true);
    expect(dk4.verRels.isKeyAgreement()).toEqual(false);
  });
});
