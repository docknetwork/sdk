import { CheqdAPI } from "@docknetwork/cheqd-blockchain-api";
import {
  CheqdTestnetDid,
  CheqdStatusListCredentialId,
} from "@docknetwork/credential-sdk/types";
import { StatusList2021Credential } from "@docknetwork/credential-sdk/vc";
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
    {
      DID: CheqdTestnetDid,
      StatusListCredentialId: CheqdStatusListCredentialId,
      StatusListCredential: StatusList2021Credential
    }
  );

  generateStatusListCredentialModuleTests(
    {
      did: new MultiApiDIDModule([new CheqdDIDModule(cheqd)]),
      statusListCredential: new MultiApiStatusListCredentialModule([new CheqdStatusListCredentialModule(cheqd)]),
    },
    {
      DID: CheqdTestnetDid,
      StatusListCredentialId: CheqdStatusListCredentialId,
      StatusListCredential: StatusList2021Credential
    }
  );
});
