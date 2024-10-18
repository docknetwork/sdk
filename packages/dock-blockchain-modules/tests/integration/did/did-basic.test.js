import {
  DockDid,
  VerificationRelationship,
  DidKey,
} from "@docknetwork/credential-sdk/types";
import { randomAsHex } from "@docknetwork/credential-sdk/utils";
import {
  NoDIDError,
  NoOffchainDIDError,
} from "@docknetwork/credential-sdk/modules";
import {
  Ed25519Keypair,
  DidKeypair,
} from "@docknetwork/credential-sdk/keypairs";

import { DockAPI } from "@docknetwork/dock-blockchain-api";
import { DockCoreModules } from "../../../src";

import {
  FullNodeEndpoint,
  TestKeyringOpts,
  TestAccountURI,
} from "../../test-constants";
import { checkVerificationMethods } from "../helpers";
import {
  DIDDocument,
  ServiceEndpoint,
} from "@docknetwork/credential-sdk/types";

describe("Basic DID tests", () => {
  const dock = new DockAPI();
  const modules = new DockCoreModules(dock);

  // Generate a random DID
  const dockDid = DockDid.random();

  // Generate first key with this seed. The key type is Sr25519
  const seed = randomAsHex(32);

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

  test("Has keyring and account", () => {
    expect(!!dock.keyring).toBe(true);
    expect(!!dock.account).toBe(true);
  });

  test.only("Can create and update document", async () => {
    const did = DockDid.random();

    const pair = new Ed25519Keypair(seed);
    const didPair = new DidKeypair([did, 1], pair);

    const doc = DIDDocument.create(did, [didPair.didKey()], [did]);

    await modules.did.createDocument(doc);
    expect((await modules.did.getDocument(did)).toJSON()).toEqual(doc.toJSON());

    const pair2 = Ed25519Keypair.random();
    const didPair2 = new DidKeypair([did, 2], pair2);

    const service1 = new ServiceEndpoint("LinkedDomains", [
      "ServiceEndpoint#1",
    ]);

    doc
      .addServiceEndpoint([did, "service1"], service1)
      .addKey([did, 2], didPair2.didKey())
      .removeKey([did, 1]);

    await modules.did.updateDocument(doc, didPair);

    expect((await modules.did.getDocument(did)).toJSON()).toEqual(doc.toJSON());

    const service2 = new ServiceEndpoint("LinkedDomains", [
      "ServiceEndpoint#1",
    ]);

    doc
      .removeServiceEndpoint("service1")
      .addServiceEndpoint([did, "service2"], service2);
    await modules.did.updateDocument(doc, didPair2);

    expect((await modules.did.getDocument(did)).toJSON()).toEqual(doc.toJSON());
  });

  test("Can create a DID", async () => {
    // DID does not exist
    await expect(
      modules.did.dockOnly.getOnchainDidDetail(dockDid)
    ).rejects.toThrow(NoDIDError);

    const pair = new Ed25519Keypair(seed);
    const publicKey = pair.publicKey();

    const verRels = new VerificationRelationship();
    const didKey = new DidKey(publicKey, verRels);

    await modules.did.dockOnly.newOnchain(dockDid, [didKey], [], false);
    const didDetail = await modules.did.dockOnly.getOnchainDidDetail(dockDid);
    expect(didDetail.lastKeyId).toBe(1);
    expect(didDetail.activeControllerKeys).toBe(1);
    expect(didDetail.activeControllers).toBe(1);
    await expect(
      modules.did.dockOnly.isController(dockDid, dockDid)
    ).resolves.toEqual(true);

    // DID cannot be fetched as off-chain DID
    await expect(
      modules.did.dockOnly.getOffchainDidDetail(dockDid)
    ).rejects.toThrow(NoOffchainDIDError);
  }, 30000);

  test("Get key for DID", async () => {
    const dk = await modules.did.dockOnly.getDidKey(dockDid, 1);
    const pair = new Ed25519Keypair(seed);
    expect(dk.publicKey).toEqual(pair.publicKey());
    expect(dk.verRels.isAuthentication()).toEqual(true);
    expect(dk.verRels.isAssertion()).toEqual(true);
    expect(dk.verRels.isCapabilityInvocation()).toEqual(true);
    expect(dk.verRels.isKeyAgreement()).toEqual(false);
  });

  test("Can get a DID document", async () => {
    function check(typedDoc) {
      const doc = typedDoc.toJSON();
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
  }, 10000);

  test("Can attest with a DID", async () => {
    const iri = "my iri";
    const pair = new DidKeypair([dockDid, 1], new Ed25519Keypair(seed));

    await modules.attest.setClaim(iri, dockDid, pair);

    const att = await modules.attest.getAttests(dockDid);
    expect(att).toEqual(iri);

    // Get document to verify the claim is there
    const didDocument = await modules.did.getDocument(dockDid);

    // Verify attests property exists
    expect(didDocument.attests.value).toBe(iri);
  }, 30000);

  test("Can remove DID", async () => {
    const pair = new DidKeypair([dockDid, 1], new Ed25519Keypair(seed));
    await modules.did.removeDocument(dockDid, pair);
    // DID removed
    await expect(modules.did.getDocument(dockDid)).rejects.toThrow(NoDIDError);
    await expect(
      modules.did.dockOnly.getOnchainDidDetail(dockDid)
    ).rejects.toThrow(NoDIDError);
    await expect(modules.did.dockOnly.getDidKey(dockDid, 1)).rejects.toThrow();
    await expect(
      modules.did.dockOnly.isController(dockDid, dockDid)
    ).resolves.toEqual(false);
  });
});
