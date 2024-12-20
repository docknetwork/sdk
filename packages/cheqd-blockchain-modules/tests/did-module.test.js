import { CheqdAPI } from "@docknetwork/cheqd-blockchain-api";
import { CheqdTestnetDid } from "@docknetwork/credential-sdk/types";
import didModuleTests from "@docknetwork/credential-sdk/modules/tests/did-module";
import CheqdDIDModule from "../src/did/module";
import { faucet, url, network } from "./constants";
import { MultiApiDIDModule } from "@docknetwork/credential-sdk/modules";
import { CheqdOffchainSignatureParamsRef } from "../../credential-sdk/src/types";

describe("DIDModule", () => {
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

  didModuleTests(
    { did: new CheqdDIDModule(cheqd) },
    {
      DID: CheqdTestnetDid,
      OffchainSignatureParamsRef: CheqdOffchainSignatureParamsRef,
    }
  );
  didModuleTests(
    { did: new MultiApiDIDModule([new CheqdDIDModule(cheqd)]) },
    {
      DID: CheqdTestnetDid,
      OffchainSignatureParamsRef: CheqdOffchainSignatureParamsRef,
    }
  );
});
