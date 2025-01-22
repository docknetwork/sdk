import { CheqdAPI } from "@docknetwork/cheqd-blockchain-api";
import { CheqdAccumulatorCommon } from "@docknetwork/credential-sdk/types";
import {
  MultiApiDIDModule,
  MultiApiAccumulatorModule,
} from "@docknetwork/credential-sdk/modules";
import generateAccumulatorModuleTests from "@docknetwork/credential-sdk/modules/tests/accumulator-module";
import CheqdDIDModule from "../src/did/module";
import { faucet, url, network } from "./constants";
import CheqdAccumulatorModule from "../src/accumulator/module";
import { initializeWasm } from "@docknetwork/credential-sdk/crypto";

describe("AccumulatorModule", () => {
  const cheqd = new CheqdAPI();

  beforeAll(async () => {
    await cheqd.init({
      url,
      wallet: await faucet.wallet(),
      network,
    });

    await initializeWasm();
  });

  afterAll(async () => {
    await cheqd.disconnect();
  });

  generateAccumulatorModuleTests(
    {
      did: new CheqdDIDModule(cheqd),
      accumulator: new CheqdAccumulatorModule(cheqd),
    },
    {
      ...cheqd.constructor.Types[network],
      AccumulatorCommon: CheqdAccumulatorCommon,
    }
  );

  generateAccumulatorModuleTests(
    {
      did: new MultiApiDIDModule([new CheqdDIDModule(cheqd)]),
      accumulator: new MultiApiAccumulatorModule([
        new CheqdAccumulatorModule(cheqd),
      ]),
    },
    {
      ...cheqd.constructor.Types[network],
      AccumulatorCommon: CheqdAccumulatorCommon,
    }
  );
});
