import { CheqdAPI } from "@docknetwork/cheqd-blockchain-api";
import { CheqdTestnetDid } from "@docknetwork/credential-sdk/types";
import didModuleTests from "@docknetwork/credential-sdk/generate-tests/did-module";
import CheqdDIDModule from "../src/did/module";
import { faucet } from "./constants";

describe("DIDModule", () => {
  const cheqd = new CheqdAPI();

  beforeAll(async () => {
    await cheqd.init({
      url: process.env.ENDPOINT_URL || "http://localhost:26657",
      mnemonic: faucet.mnemonic,
    });
  });

  afterAll(async () => {
    await cheqd.disconnect();
  });

  didModuleTests({ did: new CheqdDIDModule(cheqd) }, { DID: CheqdTestnetDid });
});
