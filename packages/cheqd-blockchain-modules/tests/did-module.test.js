import {
  DidKeypair,
  Ed25519Keypair,
} from "@docknetwork/credential-sdk/keypairs";
import { CheqdAPI } from "@docknetwork/cheqd-blockchain-api";
import CheqdDIDModule from "../src/did/module";
import { faucet } from "./constants";
import {
  DIDDocument,
  BBSPublicKeyValue,
  DidKey,
  BBSPlusPublicKeyValue,
  PSPublicKeyValue,
  VerificationMethodRef,
  CheqdTestnetDid,
} from "@docknetwork/credential-sdk/types";
import { TypedBytes } from "@docknetwork/credential-sdk/types/generic";
import { ServiceEndpoint } from "@docknetwork/credential-sdk/types/did/offchain";
import { NoDIDError } from "@docknetwork/credential-sdk/modules/did";

describe("DIDModule", () => {
  const cheqd = new CheqdAPI();
  const module = new CheqdDIDModule(cheqd);

  beforeAll(async () => {
    await cheqd.init({
      url: process.env.ENDPOINT_URL || "http://localhost:26657",
      mnemonic: faucet.mnemonic,
    });
  });

  afterAll(async () => {
    await cheqd.disconnect();
  });

  it("Creates basic `DIDDocument` with keys", async () => {
    const did = CheqdTestnetDid.random();

    const keyPair = Ed25519Keypair.random();
    const didKeypair = new DidKeypair([did, 1], keyPair);

    const document = DIDDocument.create(did, [didKeypair.didKey()]);

    await module.createDocument(document, didKeypair);

    expect((await module.getDocument(did)).toJSON()).toEqual(document.toJSON());
  });

  it("Operates with `DIDDocument` containing BBS/BBSPlus/PS keys", async () => {
    const did = CheqdTestnetDid.random();

    const keyPair = Ed25519Keypair.random();
    const didKeypair = new DidKeypair([did, 1], keyPair);

    const bbsKey = new BBSPublicKeyValue(TypedBytes.random(100));
    const bbsPlusKey = new BBSPlusPublicKeyValue(TypedBytes.random(100));
    const psKey = new PSPublicKeyValue(TypedBytes.random(1000));

    const document = DIDDocument.create(did, [
      didKeypair.didKey(),
      new DidKey(bbsKey),
      new DidKey(bbsPlusKey),
      new DidKey(psKey),
    ]);

    await module.createDocument(document, didKeypair);

    expect((await module.getDocument(did)).toJSON()).toEqual(document.toJSON());

    document.removeKey([did, 3]);

    await module.updateDocument(document, didKeypair);

    expect((await module.getDocument(did)).toJSON()).toEqual(document.toJSON());

    expect(document.didKeys().toJSON()).toEqual([
      [didKeypair.verificationMethodId.toJSON(), didKeypair.didKey().toJSON()],
      [new VerificationMethodRef(did, 2).toJSON(), new DidKey(bbsKey).toJSON()],
      [new VerificationMethodRef(did, 4).toJSON(), new DidKey(psKey).toJSON()],
    ]);
  });

  it("Operates with `DIDDocument` containing services", async () => {
    const did = CheqdTestnetDid.random();

    const keyPair = Ed25519Keypair.random();
    const didKeypair = new DidKeypair([did, 1], keyPair);

    const service1 = new ServiceEndpoint("LinkedDomains", [
      "ServiceEndpoint#1",
    ]);
    const service2 = new ServiceEndpoint("LinkedDomains", [
      "ServiceEndpoint#2",
    ]);

    const document = DIDDocument.create(did, [didKeypair.didKey()], [did], {
      service1,
      service2,
    });

    await module.createDocument(document, didKeypair);

    expect((await module.getDocument(did)).toJSON()).toEqual(document.toJSON());

    document.removeServiceEndpoint([did, "service2"]);

    await module.updateDocument(document, didKeypair);

    expect((await module.getDocument(did)).toJSON()).toEqual(document.toJSON());

    expect(document.service.length).toEqual(1);
  });

  it("Updates `DIDDocument`'s keys", async () => {
    const did = CheqdTestnetDid.random();

    const keyPair1 = Ed25519Keypair.random();
    const keyPair2 = Ed25519Keypair.random();
    const keyPair3 = Ed25519Keypair.random();

    const didKeypair1 = new DidKeypair([did, 1], keyPair1);
    const didKeypair2 = new DidKeypair([did, 2], keyPair2);
    const didKeypair3 = new DidKeypair([did, 3], keyPair3);

    const document = DIDDocument.create(did, [
      didKeypair1.didKey(),
      didKeypair2.didKey(),
    ]);

    await module.createDocument(document, didKeypair2);
    expect((await module.getDocument(did)).toJSON()).toEqual(document.toJSON());

    document.removeKey([did, 2]);
    await module.updateDocument(document, didKeypair1);
    expect((await module.getDocument(did)).toJSON()).toEqual(document.toJSON());

    await expect(() =>
      module.updateDocument(document, didKeypair2)
    ).rejects.toThrow();

    document.addKey([did, 3], didKeypair3.didKey());
    await module.updateDocument(document, didKeypair1);
    expect((await module.getDocument(did)).toJSON()).toEqual(document.toJSON());
  });

  it("Deactivates `DIDDocument`", async () => {
    const did = CheqdTestnetDid.random();

    const keyPair = Ed25519Keypair.random();
    const didKeypair = new DidKeypair([did, 1], keyPair);

    const document = DIDDocument.create(did, [didKeypair.didKey()]);

    await module.createDocument(document, didKeypair);
    expect(
      (await module.cheqdOnly.getDidDocumentWithMetadata(did)).metadata
        .deactivated
    ).toBe(false);
    expect((await module.getDocument(did)).toJSON()).toEqual(document.toJSON());

    await module.removeDocument(did, didKeypair);
    expect(
      (await module.cheqdOnly.getDidDocumentWithMetadata(did)).metadata
        .deactivated
    ).toBe(true);
    expect(() => module.getDocument(did)).rejects.toThrow(new NoDIDError(did));
  });
});
