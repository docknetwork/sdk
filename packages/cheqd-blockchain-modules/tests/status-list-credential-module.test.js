import { CheqdAPI } from "@docknetwork/cheqd-blockchain-api";
import { MultiApiStatusListCredentialModule } from "@docknetwork/credential-sdk/modules";
import generateStatusListCredentialModuleTests from "@docknetwork/credential-sdk/modules/tests/status-list-credential-module";
import CheqdDIDModule from "../src/did/module";
import { faucet, url, network } from "./constants";
import CheqdStatusListCredentialModule from "../src/status-list-credential/module";
import { MultiApiDIDModule } from "@docknetwork/credential-sdk/modules";

describe("StatusListCredentialModule", () => {
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

  generateStatusListCredentialModuleTests(
    {
      did: new CheqdDIDModule(cheqd),
      statusListCredential: new CheqdStatusListCredentialModule(cheqd),
    },
    cheqd.constructor.Types[network]
  );

  generateStatusListCredentialModuleTests(
    {
      did: new MultiApiDIDModule([new CheqdDIDModule(cheqd)]),
      statusListCredential: new MultiApiStatusListCredentialModule([
        new CheqdStatusListCredentialModule(cheqd),
      ]),
    },
    cheqd.constructor.Types[network]
  );
});
