import {
  DidKeypair,
  Ed25519Keypair,
} from "@docknetwork/credential-sdk/keypairs";
import { CheqdAPI } from "@docknetwork/cheqd-blockchain-api";
import { timeout } from "@docknetwork/credential-sdk/utils";
import {
  DIDDocument,
  CheqdTestnetDid,
} from "@docknetwork/credential-sdk/types";
import CheqdDIDModule from "../src/did/module";
import { faucet } from "./constants";
import CheqdAttestModule from "../src/attest/module";

describe("DIDModule", () => {
  const cheqd = new CheqdAPI();
  const didModule = new CheqdDIDModule(cheqd);
  const attestModule = new CheqdAttestModule(cheqd);

  beforeAll(async () => {
    await cheqd.init({
      url: process.env.ENDPOINT_URL || "http://localhost:26657",
      mnemonic: faucet.mnemonic,
    });
  });

  afterAll(async () => {
    await cheqd.disconnect();
  });

  it("Creates `DIDDocument` and attaches attestation for it", async () => {
    const did = CheqdTestnetDid.random();

    const keyPair = Ed25519Keypair.random();
    const didKeypair = new DidKeypair([did, 1], keyPair);

    const document = DIDDocument.create(did, [didKeypair.didKey()]);

    await didModule.createDocument(document, didKeypair);

    expect((await didModule.getDocument(did)).toJSON()).toEqual(
      document.toJSON(),
    );

    const iri = "some iri";
    await attestModule.setClaim(iri, did, didKeypair);

    expect((await attestModule.getAttests(did)).toString()).toBe(iri);
    document.setAttests(iri);
    expect((await didModule.getDocument(did)).toJSON()).toEqual(
      document.toJSON(),
    );

    const iri2 = "other iri";
    await attestModule.setClaim(iri2, did, didKeypair);
    await timeout(500);
    expect((await attestModule.getAttests(did)).toString()).toBe(iri2);
    document.setAttests(iri2);
    expect((await didModule.getDocument(did)).toJSON()).toEqual(
      document.toJSON(),
    );
  });
});
