import { CheqdAPI } from "@docknetwork/cheqd-blockchain-api";
import {
  CheqdTestnetDid,
  CheqdOffchainSignatureParamsRef,
} from "@docknetwork/credential-sdk/types";
import generateOffchainSignaturesModuleTests from "@docknetwork/credential-sdk/modules/tests/offchain-signatures-module";
import { MultiApiCoreModules } from "@docknetwork/credential-sdk/modules";
import { faucet, url, network } from "./constants";
import { CheqdCoreModules } from "../src";

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

  generateOffchainSignaturesModuleTests(new CheqdCoreModules(cheqd), {
    DID: CheqdTestnetDid,
    OffchainSignaturesParamsRef: CheqdOffchainSignatureParamsRef,
  });

  generateOffchainSignaturesModuleTests(
    new MultiApiCoreModules([new CheqdCoreModules(cheqd)]),
    {
      DID: CheqdTestnetDid,
      OffchainSignaturesParamsRef: CheqdOffchainSignatureParamsRef,
    }
  );
});
