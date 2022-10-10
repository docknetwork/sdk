import { randomAsHex } from '@polkadot/util-crypto';

import { DockAPI } from '../../../src';
import { ATTESTS_IRI } from '../../../src/modules/did';

import {
  createNewDockDID,
  getHexIdentifierFromDID,
  NoDIDError,
  NoOffchainDIDError,
} from '../../../src/utils/did';
import { FullNodeEndpoint, TestKeyringOpts, TestAccountURI } from '../../test-constants';
import { getPublicKeyFromKeyringPair } from '../../../src/utils/misc';
import {
  VerificationRelationship, DidKey,
} from '../../../src/public-keys';
import { checkVerificationMethods } from '../helpers';

describe('Basic DID tests', () => {
  const dock = new DockAPI();

  // Generate a random DID
  const dockDid = createNewDockDID();
  const hexDid = getHexIdentifierFromDID(dockDid);

  // Generate first key with this seed. The key type is Sr25519
  const seed = randomAsHex(32);

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
  });

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);

  test('Has keyring and account', () => {
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
    expect(!!dock.keyring).toBe(true);
    expect(!!dock.account).toBe(true);
  });

  test('Can create a DID', async () => {
    // DID does not exist already
    await expect(dock.did.getOnchainDidDetail(hexDid)).rejects.toThrow(NoDIDError);

    const pair = dock.keyring.addFromUri(seed);
    const publicKey = getPublicKeyFromKeyringPair(pair);

    const verRels = new VerificationRelationship();
    const didKey = new DidKey(publicKey, verRels);

    await dock.did.new(dockDid, [didKey], [], false);
    const didDetail = await dock.did.getOnchainDidDetail(hexDid);
    expect(didDetail.lastKeyId).toBe(1);
    expect(didDetail.activeControllerKeys).toBe(1);
    expect(didDetail.activeControllers).toBe(1);
    await expect(dock.did.isController(dockDid, dockDid)).resolves.toEqual(true);

    // DID cannot be fetched as off-chain DID
    await expect(dock.did.getOffchainDidDetail(hexDid)).rejects.toThrow(NoOffchainDIDError);
  }, 30000);

  test('Get key for DID', async () => {
    const dk = await dock.did.getDidKey(dockDid, 1);
    const pair = dock.keyring.addFromUri(seed);
    expect(dk.publicKey).toEqual(getPublicKeyFromKeyringPair(pair));
    expect(dk.verRels.isAuthentication()).toEqual(true);
    expect(dk.verRels.isAssertion()).toEqual(true);
    expect(dk.verRels.isCapabilityInvocation()).toEqual(true);
    expect(dk.verRels.isKeyAgreement()).toEqual(false);
  });

  test('Can get a DID document', async () => {
    function check(doc) {
      expect(!!doc).toBe(true);
      expect(doc.controller.length).toEqual(1);
      checkVerificationMethods(dockDid, doc, 1, 0);
      expect(doc.authentication.length).toEqual(1);
      expect(doc.authentication[0]).toEqual(`${dockDid}#keys-1`);
      expect(doc.assertionMethod.length).toEqual(1);
      expect(doc.assertionMethod[0]).toEqual(`${dockDid}#keys-1`);
      expect(doc.capabilityInvocation.length).toEqual(1);
      expect(doc.capabilityInvocation[0]).toEqual(`${dockDid}#keys-1`);
    }

    const doc = await dock.did.getDocument(dockDid);
    check(doc);

    // The same checks should pass when passing the flag for BBS+ keys
    const doc1 = await dock.did.getDocument(dockDid, { getBbsPlusSigKeys: false });
    check(doc1);

    const doc2 = await dock.did.getDocument(dockDid, { getBbsPlusSigKeys: true });
    check(doc2);
  }, 10000);

  test('Can attest with a DID', async () => {
    const priority = 1;
    const iri = 'my iri';
    const pair = dock.keyring.addFromUri(seed);

    await dock.did.setClaim(priority, iri, dockDid, pair, 1, undefined, false);

    const att = await dock.did.getAttests(hexDid);
    expect(att).toEqual(iri);

    // Get document to verify the claim is there
    const didDocument = await dock.did.getDocument(dockDid);

    // Verify attests property exists
    expect(didDocument[ATTESTS_IRI]).toEqual(iri);
  }, 30000);

  test('Can remove DID', async () => {
    const pair = dock.keyring.addFromUri(seed);
    await dock.did.remove(dockDid, dockDid, pair, 1, undefined, false);
    // DID removed
    await expect(dock.did.getDocument(dockDid)).rejects.toThrow(NoDIDError);
    await expect(dock.did.getOnchainDidDetail(hexDid)).rejects.toThrow(NoDIDError);
    await expect(dock.did.getDidKey(dockDid, 1)).rejects.toThrow();
    await expect(dock.did.isController(hexDid, hexDid)).resolves.toEqual(false);
  });
});
