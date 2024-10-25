import { DockAPI } from "@docknetwork/dock-blockchain-api";
import { DockDid } from "@docknetwork/credential-sdk/types";
import { MultiApiDIDModule, MultiApiAttestModule } from '@docknetwork/credential-sdk/modules';
import generateAttestModuleTests from "@docknetwork/credential-sdk/modules/tests/attest-module";
import { DockDIDModule, DockAttestModule } from "../../../src";
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
} from "../../test-constants";

describe("AttestModule", () => {
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

  generateAttestModuleTests(
    { did: new DockDIDModule(dock), attest: new DockAttestModule(dock) },
    { DID: DockDid }
  );

  generateAttestModuleTests(
    { did: new MultiApiDIDModule([new DockDIDModule(dock)]), attest: new MultiApiAttestModule([new DockAttestModule(dock)]) },
    { DID: DockDid }
  );
});
