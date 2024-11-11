import { DockAPI } from "@docknetwork/dock-blockchain-api";
import generateOffchainSignaturesModuleTests from "@docknetwork/credential-sdk/modules/tests/offchain-signatures-module";
import {
  MultiApiOffchainSignaturesModule,
  MultiApiDIDModule,
} from "@docknetwork/credential-sdk/modules";
import { DockDIDModule, DockOffchainSignaturesModule } from "../../../src";
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
} from "../../test-constants";
import {
  DockDid,
  DockOffchainSignatureParamsRef,
} from "@docknetwork/credential-sdk/types";

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

  generateOffchainSignaturesModuleTests(
    {
      did: new DockDIDModule(dock),
      offchainSignatures: new DockOffchainSignaturesModule(dock),
    },
    {
      DID: DockDid,
      OffchainSignaturesParamsRef: DockOffchainSignatureParamsRef,
    }
  );

  generateOffchainSignaturesModuleTests(
    {
      did: new MultiApiDIDModule([new DockDIDModule(dock)]),
      offchainSignatures: new MultiApiOffchainSignaturesModule([
        new DockOffchainSignaturesModule(dock),
      ]),
    },
    {
      DID: DockDid,
      OffchainSignaturesParamsRef: DockOffchainSignatureParamsRef,
    }
  );
});
