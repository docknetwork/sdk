import { CheqdAPI } from "@docknetwork/cheqd-blockchain-api";
import { CheqdTestnetDid } from "@docknetwork/credential-sdk/types";
import { MultiApiDIDModule, MultiApiAttestModule } from "@docknetwork/credential-sdk/modules";
import generateAttestModuleTests from "@docknetwork/credential-sdk/modules/tests/attest-module";
import CheqdDIDModule from "../src/did/module";
import { faucet, url } from "./constants";
import CheqdAttestModule from "../src/attest/module";

describe("AttestModule", () => {
  const cheqd = new CheqdAPI();

  beforeAll(async () => {
    await cheqd.init({
      url: url,
      mnemonic: faucet.mnemonic,
      network: "testnet",
    });
  });

  afterAll(async () => {
    await cheqd.disconnect();
  });

  generateAttestModuleTests(
    {
      did: new CheqdDIDModule(cheqd),
      attest: new CheqdAttestModule(cheqd),
    },
    { DID: CheqdTestnetDid }
  );

  generateAttestModuleTests(
    {
      did: new MultiApiDIDModule([new CheqdDIDModule(cheqd)]),
      attest: new MultiApiAttestModule([new CheqdAttestModule(cheqd)]),
    },
    { DID: CheqdTestnetDid }
  );
});
