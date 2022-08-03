import { randomAsHex } from '@polkadot/util-crypto';
import { DockAPI, PublicKeySecp256k1 } from '../../../src';
import { createNewDockDID, getHexIdentifierFromDID } from '../../../src/utils/did';
import { FullNodeEndpoint, TestAccountURI, TestKeyringOpts } from '../../test-constants';
import { generateEcdsaSecp256k1Keypair, getPublicKeyFromKeyringPair } from '../../../src/utils/misc';
import { DidKey, VerificationRelationship } from '../../../src/public-keys';
import { checkVerificationMethods } from '../helpers';
import PublicKeyX25519 from '../../../src/public-keys/public-key-x25519';

describe('Key support for DIDs', () => {
  const dock = new DockAPI();

  // Generate a random DID
  const dockDid = createNewDockDID();
  const hexDid = getHexIdentifierFromDID(dockDid);

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
    await expect(dock.did.isController(dockDid, dockDid)).resolves.toEqual(true);

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

  test('Get DID document', async () => {
    const doc = await dock.did.getDocument(dockDid);
    expect(doc.controller.length).toEqual(1);
    checkVerificationMethods(dockDid, doc, 3, 0);
    checkVerificationMethods(dockDid, doc, 3, 1);
    checkVerificationMethods(dockDid, doc, 3, 2);
    expect(doc.authentication.length).toEqual(2);
    expect(doc.authentication[0]).toEqual(`${dockDid}#keys-1`);
    expect(doc.authentication[1]).toEqual(`${dockDid}#keys-2`);
    expect(doc.assertionMethod.length).toEqual(3);
    expect(doc.assertionMethod[0]).toEqual(`${dockDid}#keys-1`);
    expect(doc.assertionMethod[1]).toEqual(`${dockDid}#keys-2`);
    expect(doc.assertionMethod[2]).toEqual(`${dockDid}#keys-3`);
    expect(doc.capabilityInvocation.length).toEqual(2);
    expect(doc.capabilityInvocation[0]).toEqual(`${dockDid}#keys-1`);
    expect(doc.capabilityInvocation[1]).toEqual(`${dockDid}#keys-2`);
  });

  test('Add more keys to DID', async () => {
    const pair1 = generateEcdsaSecp256k1Keypair(seed4);
    const publicKey1 = PublicKeySecp256k1.fromKeyringPair(pair1);
    const verRels1 = new VerificationRelationship();
    verRels1.setCapabilityInvocation();
    verRels1.setAssertion();
    const didKey1 = new DidKey(publicKey1, verRels1);

    const pair = dock.keyring.addFromUri(seed2, null, 'ed25519');
    await dock.did.addKeys([didKey1], dockDid, dockDid, pair, 2);

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

  test('Get DID document after key addition', async () => {
    const doc = await dock.did.getDocument(dockDid);
    expect(doc.controller.length).toEqual(1);

    checkVerificationMethods(dockDid, doc, 4, 0);
    checkVerificationMethods(dockDid, doc, 4, 1);
    checkVerificationMethods(dockDid, doc, 4, 2);
    checkVerificationMethods(dockDid, doc, 4, 3);

    expect(doc.authentication.length).toEqual(2);
    expect(doc.authentication[0]).toEqual(`${dockDid}#keys-1`);
    expect(doc.authentication[1]).toEqual(`${dockDid}#keys-2`);

    expect(doc.assertionMethod.length).toEqual(4);
    expect(doc.assertionMethod[0]).toEqual(`${dockDid}#keys-1`);
    expect(doc.assertionMethod[1]).toEqual(`${dockDid}#keys-2`);
    expect(doc.assertionMethod[2]).toEqual(`${dockDid}#keys-3`);
    expect(doc.assertionMethod[3]).toEqual(`${dockDid}#keys-4`);

    expect(doc.capabilityInvocation.length).toEqual(3);
    expect(doc.capabilityInvocation[0]).toEqual(`${dockDid}#keys-1`);
    expect(doc.capabilityInvocation[1]).toEqual(`${dockDid}#keys-2`);
    expect(doc.capabilityInvocation[2]).toEqual(`${dockDid}#keys-4`);
  });

  test('Remove keys from DID', async () => {
    const pair = generateEcdsaSecp256k1Keypair(seed4);
    await dock.did.removeKeys([1, 3], dockDid, dockDid, pair, 4);

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

  test('Get DID document after key removal', async () => {
    const doc = await dock.did.getDocument(dockDid);
    expect(doc.controller.length).toEqual(1);
    checkVerificationMethods(dockDid, doc, 2, 0, 2);
    checkVerificationMethods(dockDid, doc, 2, 1, 4);
  });

  test('Add x25519 key-agreement to DID', async () => {
    const verRels = new VerificationRelationship();
    verRels.setKeyAgreement();
    // Generating a random X25519 public key
    const publicKey = new PublicKeyX25519(randomAsHex(32));
    const didKey = new DidKey(publicKey, verRels);

    const pair = dock.keyring.addFromUri(seed2, null, 'ed25519');
    await dock.did.addKeys([didKey], dockDid, dockDid, pair, 2);
    const didDetail = await dock.did.getOnchainDidDetail(hexDid);
    expect(didDetail.lastKeyId).toBe(5);
    const dk = await dock.did.getDidKey(dockDid, 5);
    expect(dk.publicKey).toEqual(publicKey);
    expect(dk.verRels.isAuthentication()).toEqual(false);
    expect(dk.verRels.isAssertion()).toEqual(false);
    expect(dk.verRels.isCapabilityInvocation()).toEqual(false);
    expect(dk.verRels.isKeyAgreement()).toEqual(true);
    const doc = await dock.did.getDocument(dockDid);
    checkVerificationMethods(dockDid, doc, 3, 2, 5);
  });
});
