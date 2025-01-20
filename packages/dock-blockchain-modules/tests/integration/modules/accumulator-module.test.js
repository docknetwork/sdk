import { DockAPI } from "@docknetwork/dock-blockchain-api";
import {
  DockAccumulatorId,
  DockAccumulatorPublicKey,
  DockAccumulatorCommon,
  DockDid,
} from "@docknetwork/credential-sdk/types";
import {
  MultiApiDIDModule,
  MultiApiAccumulatorModule,
} from "@docknetwork/credential-sdk/modules";
import generateAccumulatorModuleTests from "@docknetwork/credential-sdk/modules/tests/accumulator-module";
import { DockDIDModule, DockAccumulatorModule } from "../../../src";
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
} from "../../test-constants";
import { initializeWasm } from "@docknetwork/credential-sdk/crypto";

describe("AccumulatorModule", () => {
  const dock = new DockAPI();

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
    await initializeWasm();
  });

  afterAll(async () => {
    await dock.disconnect();
  });

  generateAccumulatorModuleTests(
    {
      did: new DockDIDModule(dock),
      accumulator: new DockAccumulatorModule(dock),
    },
    {
      Did: DockDid,
      AccumulatorPublicKey: DockAccumulatorPublicKey,
      AccumulatorId: DockAccumulatorId,
      AccumulatorCommon: DockAccumulatorCommon,
    }
  );

  generateAccumulatorModuleTests(
    {
      did: new MultiApiDIDModule([new DockDIDModule(dock)]),
      accumulator: new MultiApiAccumulatorModule([
        new DockAccumulatorModule(dock),
      ]),
    },
    {
      Did: DockDid,
      AccumulatorPublicKey: DockAccumulatorPublicKey,
      AccumulatorId: DockAccumulatorId,
      AccumulatorCommon: DockAccumulatorCommon,
    }
  );
});
