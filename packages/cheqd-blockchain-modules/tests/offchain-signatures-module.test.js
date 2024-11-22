import { CheqdAPI, CheqdNetwork } from "@docknetwork/cheqd-blockchain-api";
import {
  CheqdTestnetDid,
  CheqdOffchainSignatureParamsRef,
} from "@docknetwork/credential-sdk/types";
import { MultiApiOffchainSignaturesModule } from "@docknetwork/credential-sdk/modules";
import generateOffchainSignaturesModuleTests from "@docknetwork/credential-sdk/modules/tests/offchain-signatures-module";
import { MultiApiDIDModule, MultiApiCoreModules } from "@docknetwork/credential-sdk/modules";
import { faucet, url, network } from "./constants";
import {
  CheqdOffchainSignaturesModule,
  CheqdDIDModule,
  CheqdCoreModules
} from "../src";
import CheqdBBSModule from "../src/offchain-signatures/bbs";
import CheqdBBSPlusModule from "../src/offchain-signatures/bbs-plus";
import CheqdPSModule from "../src/offchain-signatures/ps";

describe("OffchainSignaturesModule", () => {
  const cheqd = new CheqdAPI();

  beforeAll(async () => {
    await cheqd.init({
      url,
      wallet: await faucet.wallet(),
      network,
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
