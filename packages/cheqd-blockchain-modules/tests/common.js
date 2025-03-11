import { CheqdMultiSenderAPI } from "@docknetwork/cheqd-blockchain-api";
import { MultiApiCoreModules } from "@docknetwork/credential-sdk/modules";
import { DockDid } from "@docknetwork/credential-sdk/types";
import { faucet, url, network } from "./env";
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

export function describeWithCheqdAPI(name, generate) {
  // eslint-disable-next-line
  describe(name, () => {
    const cheqd = new CheqdMultiSenderAPI({ count: 10 });

    beforeAll(async () => {
      await cheqd.init({
        url,
        wallet: await faucet.wallet(),
        network,
      });
    }, 6e4);

    afterAll(async () => {
      await cheqd.disconnect();
    });

    generate(
      cheqd,
      new CheqdCoreModules(cheqd),
      cheqd.constructor.Types[network]
    );
  });
}

export function tests(name, generateTests, customTypes) {
  // eslint-disable-next-line
  describeWithCheqdAPI(name, (_, core, types) => {
    const moduleSets = [core, new MultiApiCoreModules([core])];
    const didClasses = [
      null,
      DockDid,
      withRandomToString(DockDid),
      withRandomToString(types.Did),
    ];

    for (const modules of moduleSets) {
      for (const Did of didClasses) {
        const params = {
          ...types,
          ...customTypes,
          ...(Did && { Did }),
        };

        generateTests(modules, params);
      }
    }
  });
}
