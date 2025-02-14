import { DockDid } from "@docknetwork/credential-sdk/types";
import { CheqdAPI } from "@docknetwork/cheqd-blockchain-api";
import { MultiApiCoreModules } from "@docknetwork/credential-sdk/modules";
import { faucet, url, network } from "./constants";
import { CheqdCoreModules } from "../src";

export const withRandomToString = (klass) => {
  const name = `withRandomToString(${klass.name})`;

  const obj = {
    [name]: class extends klass {
      static random() {
        return String(super.random());
      }
    },
  };

  return obj[name];
};

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
    const didClasses = [
      null,
      DockDid,
      withRandomToString(DockDid),
      withRandomToString(cheqd.constructor.Types[network].Did),
    ];
    for (const modules of [core, new MultiApiCoreModules([core])]) {
      for (const Did of didClasses) {
        generateTests(modules, {
          ...cheqd.constructor.Types[network],
          ...customTypes,
          ...(Did && { Did }),
        });
      }
    }
  });
}
