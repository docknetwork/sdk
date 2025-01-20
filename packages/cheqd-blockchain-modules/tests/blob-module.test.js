import { CheqdAPI } from "@docknetwork/cheqd-blockchain-api";
import { MultiApiBlobModule } from "@docknetwork/credential-sdk/modules";
import generateBlobModuleTests from "@docknetwork/credential-sdk/modules/tests/blob-module";
import CheqdDIDModule from "../src/did/module";
import { faucet, url, network } from "./constants";
import CheqdBlobModule from "../src/blob/module";
import { MultiApiDIDModule } from "@docknetwork/credential-sdk/modules";

describe("BlobModule", () => {
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

  generateBlobModuleTests(
    {
      did: new CheqdDIDModule(cheqd),
      blob: new CheqdBlobModule(cheqd),
    },
    cheqd.constructor.Types[network]
  );

  generateBlobModuleTests(
    {
      did: new MultiApiDIDModule([new CheqdDIDModule(cheqd)]),
      blob: new MultiApiBlobModule([new CheqdBlobModule(cheqd)]),
    },
    cheqd.constructor.Types[network]
  );
});
