import { DockAPI } from "@docknetwork/dock-blockchain-api";
import { DockDid } from "@docknetwork/credential-sdk/types";
import generateBlobModuleTests from "@docknetwork/credential-sdk/modules/tests/blob-module";
import DockBlobModule from "../../../src/blob/module";
import { DockDIDModule } from "../../../src";
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
} from "../../test-constants";
import { DockBlobId } from "@docknetwork/credential-sdk/types";

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

  generateBlobModuleTests(
    { did: new DockDIDModule(dock), blob: new DockBlobModule(dock) },
    { DID: DockDid, BlobId: DockBlobId }
  );
});
