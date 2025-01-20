import didModuleTests from "@docknetwork/credential-sdk/modules/tests/did-module";
import { DockAPI } from "@docknetwork/dock-blockchain-api";
import { MultiApiDIDModule } from "@docknetwork/credential-sdk/modules";
import {
  DockDid,
  DockOffchainSignatureParamsRef,
} from "@docknetwork/credential-sdk/types";
import DockDIDModule from "../../../src/did/module";
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
} from "../../test-constants";

const filter = (name) =>
  name !== "Creates `DIDDocument` containing BBS/BBSPlus/PS keys" &&
  name !== "Creates `DIDDocument` containing services";

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
    {
      Did: DockDid,
      OffchainSignatureParamsRef: DockOffchainSignatureParamsRef,
    },
    filter
  );

  didModuleTests(
    { did: new MultiApiDIDModule([new DockDIDModule(dock)]) },
    {
      Did: DockDid,
      OffchainSignatureParamsRef: DockOffchainSignatureParamsRef,
    },
    filter
  );
});
