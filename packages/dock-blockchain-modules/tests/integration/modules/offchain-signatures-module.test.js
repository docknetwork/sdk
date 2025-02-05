import { DockAPI } from "@docknetwork/dock-blockchain-api";
import generateOffchainSignaturesModuleTests from "@docknetwork/credential-sdk/modules/tests/offchain-signatures-module";
import { DockCoreModules } from "../../../src";
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
} from "../../test-constants";
import { DockDid } from "@docknetwork/credential-sdk/types";
import { MultiApiCoreModules } from "@docknetwork/credential-sdk/modules";

describe("BlobModule", () => {
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

  generateOffchainSignaturesModuleTests(new DockCoreModules(dock), {
    Did: DockDid,
  });

  generateOffchainSignaturesModuleTests(
    new MultiApiCoreModules([new DockCoreModules(dock)]),
    {
      Did: DockDid,
    }
  );
});
