import { CheqdAPI } from "@docknetwork/cheqd-blockchain-api";
import { CheqdTestnetDid } from "@docknetwork/credential-sdk/types";
import generateAttestModuleTests from "@docknetwork/credential-sdk/generate-tests/attest-module";
import CheqdDIDModule from "../src/did/module";
import { faucet } from "./constants";
import CheqdAttestModule from "../src/attest/module";

describe("AttestModule", () => {
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

  generateAttestModuleTests(
    {
      did: new CheqdDIDModule(cheqd),
      attest: new CheqdAttestModule(cheqd),
    },
    { DID: CheqdTestnetDid }
  );
});
