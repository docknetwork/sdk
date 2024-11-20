import { CheqdAPI } from "@docknetwork/cheqd-blockchain-api";
import {
  CheqdTestnetDid,
  CheqdOffchainSignatureParamsRef,
} from "@docknetwork/credential-sdk/types";
import { MultiApiOffchainSignaturesModule } from "@docknetwork/credential-sdk/modules";
import generateOffchainSignaturesModuleTests from "@docknetwork/credential-sdk/modules/tests/offchain-signatures-module";
import { faucet, url } from "./constants";
import {
  CheqdOffchainSignaturesModule,
  CheqdDIDModule,
  CheqdCoreModules
} from "../src";
import { MultiApiDIDModule, MultiApiCoreModules } from "@docknetwork/credential-sdk/modules";
import CheqdBBSModule from "../src/offchain-signatures/bbs";
import CheqdBBSPlusModule from "../src/offchain-signatures/bbs-plus";
import CheqdPSModule from "../src/offchain-signatures/ps";

describe("OffchainSignaturesModule", () => {
  const cheqd = new CheqdAPI();

  beforeAll(async () => {
    await cheqd.init({
      url,
      mnemonic: faucet.mnemonic,
      network: "testnet",
    });
  });

  afterAll(async () => {
    await cheqd.disconnect();
  });

  generateOffchainSignaturesModuleTests(
    new CheqdCoreModules(cheqd),
    {
      DID: CheqdTestnetDid,
      OffchainSignaturesParamsRef: CheqdOffchainSignatureParamsRef,
    }
  );

  generateOffchainSignaturesModuleTests(
    new MultiApiCoreModules([
      new CheqdCoreModules(cheqd),
    ]),
    {
      DID: CheqdTestnetDid,
      OffchainSignaturesParamsRef: CheqdOffchainSignatureParamsRef,
    }
  );
});
