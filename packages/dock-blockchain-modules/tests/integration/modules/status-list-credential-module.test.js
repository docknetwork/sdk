import { DockAPI } from "@docknetwork/dock-blockchain-api";
import {
  DockDid,
  DockStatusListCredentialId,
} from "@docknetwork/credential-sdk/types";
import { StatusList2021Credential } from "@docknetwork/credential-sdk/vc";
import { MultiApiStatusListCredentialModule } from "@docknetwork/credential-sdk/modules";
import { MultiApiDIDModule } from "@docknetwork/credential-sdk/modules";
import generateStatusListCredentialModuleTests from "@docknetwork/credential-sdk/modules/tests/status-list-credential-module";
import { DockDIDModule, DockStatusListCredentialModule } from "../../../src";
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
} from "../../test-constants";

describe("StatusListCredentialModule", () => {
  const dock = new DockAPI();

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
  });

  afterAll(async () => {
    await dock.disconnect();
  });

  generateStatusListCredentialModuleTests(
    {
      did: new DockDIDModule(dock),
      statusListCredential: new DockStatusListCredentialModule(dock),
    },
    {
      Did: DockDid,
      StatusListCredentialId: DockStatusListCredentialId,
      StatusListCredential: StatusList2021Credential,
    }
  );

  generateStatusListCredentialModuleTests(
    {
      did: new MultiApiDIDModule([new DockDIDModule(dock)]),
      statusListCredential: new MultiApiStatusListCredentialModule([
        new DockStatusListCredentialModule(dock),
      ]),
    },
    {
      Did: DockDid,
      StatusListCredentialId: DockStatusListCredentialId,
      StatusListCredential: StatusList2021Credential,
    }
  );
});
