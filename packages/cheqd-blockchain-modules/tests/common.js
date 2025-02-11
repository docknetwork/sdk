import { DockDid } from "@docknetwork/credential-sdk/types";
import { CheqdAPI } from "@docknetwork/cheqd-blockchain-api";
import { MultiApiCoreModules } from "@docknetwork/credential-sdk/modules";
import { faucet, url, network } from "./constants";
import { CheqdCoreModules } from "../src";

export class DockDidRandomToString extends DockDid {
  static random() {
    return String(super.random());
  }
}

export function tests(name, generateTests, customTypes) {
  // eslint-disable-next-line
  describe(name, () => {
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

    const core = new CheqdCoreModules(cheqd);
    for (const modules of [core, new MultiApiCoreModules([core])]) {
      for (const Did of [null, DockDid, DockDidRandomToString]) {
        generateTests(modules, {
          ...cheqd.constructor.Types[network],
          ...customTypes,
          ...(Did && { Did }),
        });
      }
    }
  });
}
