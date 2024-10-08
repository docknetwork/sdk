import { randomAsHex, u8aToHex } from "@docknetwork/credential-sdk/utils";
import { DockAPI } from "@docknetwork/dock-blockchain-api";
import {
  DockDid,
  DidKey,
  VerificationRelationship,
  LinkedDomains,
} from "@docknetwork/credential-sdk/types";
import {
  Ed25519Keypair,
  DidKeypair,
} from "@docknetwork/credential-sdk/keypairs";
import { NoDIDError } from "@docknetwork/credential-sdk/modules";
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
} from "../../test-constants";
import { ServiceEndpointOrigins } from "@docknetwork/credential-sdk/types";
import { DockCoreModules } from "../../../src";

describe("DID service endpoints", () => {
  const encoder = new TextEncoder();

  const dock = new DockAPI();
  const modules = new DockCoreModules(dock);

  const dockDid1 = DockDid.random();

  // This DID will not be controlled by itself
  const dockDid2 = DockDid.random();

  const seed1 = randomAsHex(32);
  const seed2 = randomAsHex(32);

  const pair1 = new DidKeypair([dockDid1, 1], new Ed25519Keypair(seed1));

  const spId1Text = `${dockDid1}#linked-domain-1`;
  const spId2Text = `${dockDid2}#linked-domain-1`;
  const spId3Text = `${dockDid2}#linked-domain-2`;
  const spId1 = spId1Text;
  const spId2 = spId2Text;
  const spId3 = spId3Text;

  const origins1Text = ["https://foo.example.com"];
  const origins2Text = [
    "https://foo.example.com",
    "https://bar.example.com",
    "https://baz.example.com",
  ];
  const origins3Text = ["https://biz.example.com"];

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

  test("Create DIDs and add service endpoint", async () => {
    const publicKey1 = pair1.publicKey();
    const didKey1 = new DidKey(publicKey1);
    console.log(didKey1);

    await modules.did.dockOnly.send.newOnchain(dockDid1, [didKey1], [], false);

    const spType = new LinkedDomains();

    // `dockDid1` adds service endpoint for itself
    const origins1 = new ServiceEndpointOrigins(
      ...origins1Text.map((u) => u8aToHex(encoder.encode(u)))
    );
    await modules.did.dockOnly.addServiceEndpoint(
      spId1,
      spType,
      origins1,
      dockDid1,
      pair1
    );

    const sp = await modules.did.dockOnly.getServiceEndpoint(spId1);
    expect(sp.types).toEqual(spType);
    expect(sp.origins).toEqual(origins1);

    const pair2 = new DidKeypair([dockDid2, 1], new Ed25519Keypair(seed2));
    const publicKey2 = pair2.publicKey();
    const vr = new VerificationRelationship();
    // vr.setAssertion();
    const didKey2 = new DidKey(publicKey2, vr);

    await modules.did.dockOnly.send.newOnchain(
      dockDid2,
      [didKey2],
      [dockDid1],
      false
    );

    // `dockDid1` adds service endpoint to `dockDid2`
    const origins2 = new ServiceEndpointOrigins(
      ...origins2Text.map((u) => u8aToHex(encoder.encode(u)))
    );
    await modules.did.dockOnly.addServiceEndpoint(
      spId2,
      spType,
      origins2,
      dockDid2,
      pair2
    );

    const sp1 = await modules.did.dockOnly.getServiceEndpoint(spId2);
    expect(sp1.types).toEqual(spType);
    expect(sp1.origins).toEqual(origins2);
  }, 3e4);

  test("Get DID document with service endpoints", async () => {
    const [doc1, doc2] = (
      await Promise.all([
        modules.did.getDocument(dockDid1),
        modules.did.getDocument(dockDid2),
      ])
    ).map((doc) => doc.toJSON());
    expect(doc1.service.length).toEqual(1);
    expect(doc1.service[0].id).toEqual(spId1Text);
    expect(doc1.service[0].type).toEqual("LinkedDomains");
    expect(doc1.service[0].serviceEndpoint).toEqual(origins1Text);

    expect(doc2.service.length).toEqual(1);
    expect(doc2.service[0].id).toEqual(spId2Text);
    expect(doc2.service[0].type).toEqual("LinkedDomains");
    expect(doc2.service[0].serviceEndpoint).toEqual(origins2Text);
  }, 3e4);

  test("Add another service endpoint", async () => {
    const spType = new LinkedDomains();
    const origins = new ServiceEndpointOrigins(
      ...origins3Text.map((u) => u8aToHex(encoder.encode(u)))
    );
    await modules.did.dockOnly.addServiceEndpoint(
      spId3,
      spType,
      origins,
      dockDid2,
      pair1
    );
    const sp = await modules.did.dockOnly.getServiceEndpoint(spId3);
    expect(sp.types).toEqual(spType);
    expect(sp.origins).toEqual(origins);
  }, 3e4);

  test("Get DID document with multiple service endpoints", async () => {
    const doc = (await modules.did.getDocument(dockDid2)).toJSON();
    expect(doc.service.length).toEqual(2);
    expect(doc.service[0].type).toEqual("LinkedDomains");
    expect(doc.service[1].type).toEqual("LinkedDomains");
    expect(
      (doc.service[0].id === spId2Text && doc.service[1].id === spId3Text) ||
        (doc.service[0].id === spId3Text && doc.service[1].id === spId2Text)
    ).toBe(true);

    expect(
      (JSON.stringify(doc.service[0].serviceEndpoint) ===
        JSON.stringify(origins2Text) &&
        JSON.stringify(doc.service[1].serviceEndpoint) ===
          JSON.stringify(origins3Text)) ||
        (JSON.stringify(doc.service[0].serviceEndpoint) ===
          JSON.stringify(origins3Text) &&
          JSON.stringify(doc.service[1].serviceEndpoint) ===
            JSON.stringify(origins2Text))
    ).toBe(true);
  });

  test("Remove service endpoint", async () => {
    console.log(spId2);
    // `dockDid1` removes service endpoint of `dockDid2`
    await modules.did.dockOnly.removeServiceEndpoint(spId2, pair1);
    await expect(
      modules.did.dockOnly.getServiceEndpoint(spId2)
    ).rejects.toThrow();
  }, 3e4);

  test("Removing DID removes service endpoint as well", async () => {
    await modules.did.removeDocument(dockDid1, pair1);

    await expect(
      modules.did.dockOnly.getOnchainDidDetail(dockDid1.asDid)
    ).rejects.toThrow(NoDIDError);
    await expect(
      modules.did.dockOnly.getServiceEndpoint(spId1)
    ).rejects.toThrow();
  }, 3e4);
});
