import {
  Secp256k1Keypair,
  Ed25519Keypair,
  DidKeypair,
} from "@docknetwork/credential-sdk/keypairs";
import {
  DockDid,
  PublicKeyX25519,
  DidKey,
  VerificationRelationship,
} from "@docknetwork/credential-sdk/types";
import { randomAsHex } from "@docknetwork/credential-sdk/utils";
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
} from "../../test-constants";
import { DockAPI } from "@docknetwork/dock-blockchain-api";
import { DockCoreModules } from "../../../src";
import { checkVerificationMethods } from "../helpers";

describe("Key support for DIDs", () => {
  const dock = new DockAPI();
  const modules = new DockCoreModules(dock);

  // Generate a random DID
  const dockDid = DockDid.random();

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

  test("Create a DID with many keys", async () => {
    const pair1 = new Ed25519Keypair(seed1);
    const didKey1 = DidKey.fromKeypair(pair1);

    const pair2 = new Ed25519Keypair(seed2);
    const didKey2 = DidKey.fromKeypair(pair2);

    const pair3 = new Ed25519Keypair(seed3);
    const verRels3 = new VerificationRelationship();
    verRels3.setAssertion();
    const didKey3 = DidKey.fromKeypair(pair3, verRels3);

    await modules.did.dockOnly.newOnchain(
      dockDid,
      [didKey1, didKey2, didKey3],
      [],
      false
    );

    const didDetail = await modules.did.dockOnly.getOnchainDidDetail(dockDid);
    expect(didDetail.lastKeyId).toBe(3);
    expect(didDetail.activeControllerKeys).toBe(2);
    expect(didDetail.activeControllers).toBe(1);
    await expect(
      modules.did.dockOnly.isController(dockDid, dockDid)
    ).resolves.toEqual(true);

    for (const [i, pk] of [
      [1, pair1.publicKey()],
      [2, pair2.publicKey()],
    ]) {
      // eslint-disable-next-line no-await-in-loop
      const dk = await modules.did.dockOnly.getDidKey(dockDid, i);
      expect(dk.publicKey).toEqual(pk);
      expect(dk.verRels.isAuthentication()).toEqual(true);
      expect(dk.verRels.isAssertion()).toEqual(true);
      expect(dk.verRels.isCapabilityInvocation()).toEqual(true);
      expect(dk.verRels.isKeyAgreement()).toEqual(false);
    }

    const dk = await modules.did.dockOnly.getDidKey(dockDid, 3);
    expect(dk.publicKey).toEqual(pair3.publicKey());
    expect(dk.verRels.isAuthentication()).toEqual(false);
    expect(dk.verRels.isAssertion()).toEqual(true);
    expect(dk.verRels.isCapabilityInvocation()).toEqual(false);
    expect(dk.verRels.isKeyAgreement()).toEqual(false);
  });

  test("Get DID document", async () => {
    function check(obj) {
      const doc = obj.toJSON();
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
    }

    const doc = await modules.did.getDocument(dockDid);
    check(doc);

    // The same checks should pass when passing the flag for keys
    const doc1 = await modules.did.getDocument(dockDid, {
      getOffchainSigKeys: false,
    });
    check(doc1);

    const doc2 = await modules.did.getDocument(dockDid, {
      getOffchainSigKeys: true,
    });
    check(doc2);
  });

  test("Add more keys to DID", async () => {
    const pair1 = new Secp256k1Keypair(seed4);
    const verRels1 = new VerificationRelationship();
    verRels1.setCapabilityInvocation();
    verRels1.setAssertion();
    const didKey1 = DidKey.fromKeypair(pair1, verRels1);

    const pair = new DidKeypair([dockDid, 2], new Ed25519Keypair(seed2));
    await modules.did.dockOnly.addKeys([didKey1], dockDid, pair);

    const didDetail = await modules.did.dockOnly.getOnchainDidDetail(dockDid);
    expect(didDetail.lastKeyId).toBe(4);
    expect(didDetail.activeControllerKeys).toBe(3);
    expect(didDetail.activeControllers).toBe(1);

    const dk1 = await modules.did.dockOnly.getDidKey(dockDid, 4);
    expect(dk1.publicKey).toEqual(pair1.publicKey());
    expect(dk1.verRels.isAuthentication()).toEqual(false);
    expect(dk1.verRels.isAssertion()).toEqual(true);
    expect(dk1.verRels.isCapabilityInvocation()).toEqual(true);
    expect(dk1.verRels.isKeyAgreement()).toEqual(false);
  });

  test("Get DID document after key addition", async () => {
    function check(obj) {
      const doc = obj.toJSON();
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
    }

    const doc = await modules.did.getDocument(dockDid);
    check(doc);

    // The same checks should pass when passing the flag for keys
    const doc1 = await modules.did.getDocument(dockDid, {
      getOffchainSigKeys: false,
    });
    check(doc1);

    const doc2 = await modules.did.getDocument(dockDid, {
      getOffchainSigKeys: true,
    });
    check(doc2);
  });

  test("Remove keys from DID", async () => {
    const pair = new DidKeypair([dockDid, 4], new Secp256k1Keypair(seed4));
    await modules.did.dockOnly.removeKeys([1, 3], dockDid, pair);

    const didDetail = await modules.did.dockOnly.getOnchainDidDetail(dockDid);
    expect(didDetail.lastKeyId).toBe(4);
    expect(didDetail.activeControllerKeys).toBe(2);
    expect(didDetail.activeControllers).toBe(1);

    await expect(modules.did.dockOnly.getDidKey(dockDid, 1)).rejects.toThrow();
    await expect(modules.did.dockOnly.getDidKey(dockDid, 3)).rejects.toThrow();

    const pair2 = new Ed25519Keypair(seed2);
    const publicKey2 = pair2.publicKey();
    const dk2 = await modules.did.dockOnly.getDidKey(dockDid, 2);
    expect(dk2.publicKey).toEqual(publicKey2);
    expect(dk2.verRels.isAuthentication()).toEqual(true);
    expect(dk2.verRels.isAssertion()).toEqual(true);
    expect(dk2.verRels.isCapabilityInvocation()).toEqual(true);
    expect(dk2.verRels.isKeyAgreement()).toEqual(false);

    const pair4 = new Secp256k1Keypair(seed4);
    const dk4 = await modules.did.dockOnly.getDidKey(dockDid, 4);
    expect(dk4.publicKey).toEqual(pair4.publicKey());
    expect(dk4.verRels.isAuthentication()).toEqual(false);
    expect(dk4.verRels.isAssertion()).toEqual(true);
    expect(dk4.verRels.isCapabilityInvocation()).toEqual(true);
    expect(dk4.verRels.isKeyAgreement()).toEqual(false);
  });

  test("Get DID document after key removal", async () => {
    function check(doc) {
      expect(doc.controller.length).toEqual(1);
      checkVerificationMethods(dockDid, doc, 2, 0, 2);
      checkVerificationMethods(dockDid, doc, 2, 1, 4);
    }

    const doc = await modules.did.getDocument(dockDid);
    check(doc);

    // The same checks should pass when passing the flag for keys
    const doc1 = await modules.did.getDocument(dockDid, {
      getOffchainSigKeys: false,
    });
    check(doc1);

    const doc2 = await modules.did.getDocument(dockDid, {
      getOffchainSigKeys: true,
    });
    check(doc2);
  });

  test("Add x25519 key-agreement to DID", async () => {
    const verRels = new VerificationRelationship();
    verRels.setKeyAgreement();
    // Generating a random X25519 public key
    const publicKey = new PublicKeyX25519(randomAsHex(32));
    const didKey = new DidKey(publicKey, verRels);

    const pair = new DidKeypair([dockDid, 2], new Ed25519Keypair(seed2));
    await modules.did.dockOnly.addKeys([didKey], dockDid, pair);
    const didDetail = await modules.did.dockOnly.getOnchainDidDetail(dockDid);
    expect(didDetail.lastKeyId).toBe(5);
    const dk = await modules.did.dockOnly.getDidKey(dockDid, 5);
    expect(dk.publicKey).toEqual(publicKey);
    expect(dk.verRels.isAuthentication()).toEqual(false);
    expect(dk.verRels.isAssertion()).toEqual(false);
    expect(dk.verRels.isCapabilityInvocation()).toEqual(false);
    expect(dk.verRels.isKeyAgreement()).toEqual(true);
    const doc = await modules.did.getDocument(dockDid);
    checkVerificationMethods(dockDid, doc, 3, 2, 5);
  });
});
