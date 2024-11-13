import { CheqdAPI } from "@docknetwork/cheqd-blockchain-api";
import {
  CheqdTestnetDid,
  CheqdOffchainSignatureParamsRef,
} from "@docknetwork/credential-sdk/types";
import { MultiApiOffchainSignaturesModule } from "@docknetwork/credential-sdk/modules";
import generateOffchainSignaturesModuleTests from "@docknetwork/credential-sdk/modules/tests/offchain-signatures-module";
import { faucet } from "./constants";
import { CheqdOffchainSignaturesModule, CheqdDIDModule } from "../src";
import { MultiApiDIDModule } from "@docknetwork/credential-sdk/modules";
import CheqdBBSModule from "../src/offchain-signatures/bbs";
import CheqdBBSPlusModule from "../src/offchain-signatures/bbs-plus";
import CheqdPSModule from "../src/offchain-signatures/ps";

describe("OffchainSignaturesModule", () => {
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

  generateOffchainSignaturesModuleTests(
    {
      did: new CheqdDIDModule(cheqd),
      offchainSignatures: new CheqdOffchainSignaturesModule(cheqd),
      bbs: new CheqdBBSModule(cheqd),
      bbsPlus: new CheqdBBSPlusModule(cheqd),
      ps: new CheqdPSModule(cheqd),
    },
    {
      DID: CheqdTestnetDid,
      OffchainSignaturesParamsRef: CheqdOffchainSignatureParamsRef,
    }
  );

  generateOffchainSignaturesModuleTests(
    {
      did: new MultiApiDIDModule([new CheqdDIDModule(cheqd)]),
      offchainSignatures: new MultiApiOffchainSignaturesModule([
        new CheqdOffchainSignaturesModule(cheqd),
      ]),
      bbs: new MultiApiOffchainSignaturesModule([new CheqdBBSModule(cheqd)]),
      bbsPlus: new MultiApiOffchainSignaturesModule([
        new CheqdBBSPlusModule(cheqd),
      ]),
      ps: new MultiApiOffchainSignaturesModule([new CheqdPSModule(cheqd)]),
    },
    {
      DID: CheqdTestnetDid,
      OffchainSignaturesParamsRef: CheqdOffchainSignatureParamsRef,
    }
  );
});
