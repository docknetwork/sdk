import { CheqdAPI } from "@docknetwork/cheqd-blockchain-api";
import { CheqdTestnetDid } from "@docknetwork/credential-sdk/types";
import didModuleTests from "@docknetwork/credential-sdk/modules/tests/did-module";
import CheqdDIDModule from "../src/did/module";
import { faucet } from "./constants";
import { MultiApiDIDModule } from "@docknetwork/credential-sdk/modules";

describe("DIDModule", () => {
  const cheqd = new CheqdAPI();

  beforeAll(async () => {
    await cheqd.init({
      url: process.env.ENDPOINT_URL || "http://localhost:26657",
      mnemonic: faucet.mnemonic,
      network: "testnet",
    });
  });

  afterAll(async () => {
    await cheqd.disconnect();
  });

  didModuleTests({ did: new CheqdDIDModule(cheqd) }, { DID: CheqdTestnetDid });
  didModuleTests(
    { did: new MultiApiDIDModule([new CheqdDIDModule(cheqd)]) },
    { DID: CheqdTestnetDid }
  );
});
