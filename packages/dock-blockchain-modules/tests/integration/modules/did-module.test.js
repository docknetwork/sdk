import didModuleTests from "@docknetwork/credential-sdk/modules/tests/did-module";
import { DockAPI } from "@docknetwork/dock-blockchain-api";
import DockDIDModule from "../../../src/did/module";
import { MultiApiDIDModule } from '@docknetwork/credential-sdk/modules';
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
} from "../../test-constants";
import { DockDid } from "@docknetwork/credential-sdk/types";

const filter = (name) =>
  name !== "Creates `DIDDocument` containing BBS/BBSPlus/PS keys" &&
  name !== "Creates `DIDDocument` containing services"

describe("DIDModule", () => {
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

  didModuleTests(
    { did: new DockDIDModule(dock) },
    { DID: DockDid },
    filter
  );

  didModuleTests(
    { did: new MultiApiDIDModule([new DockDIDModule(dock)]) },
    { DID: DockDid },
    filter
  );
});
