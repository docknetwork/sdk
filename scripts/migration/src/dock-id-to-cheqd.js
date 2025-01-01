import { CheqdAPI } from "@docknetwork/cheqd-blockchain-api";
import { DockAPI } from "@docknetwork/dock-blockchain-api";
import {
  DockAccumulatorId,
  DockBlobId,
  DockStatusListCredentialId,
  DockDid,
} from "@docknetwork/credential-sdk/types";
import pLimit from "p-limit";
import { DockAccumulatorModule } from "@docknetwork/dock-blockchain-modules";

const mergeAwait = async (objectPromises) => {
  const acc = {};
  for await (const obj of objectPromises) {
    Object.assign(acc, obj);
  }

  return acc;
};

export default class Mappings {
  constructor() {
    this.apis = {
      testnet: new DockAPI(),
      mainnet: new DockAPI(),
    };
    this.types = {
      AccumulatorId: DockAccumulatorId,
      BlobId: DockBlobId,
      Did: DockDid,
      StatusListCredentialId: DockStatusListCredentialId,
    };
    this.paths = {
      "accumulator.accumulators": "AccumulatorId",
      "blobStore.blobs": "BlobId",
      "statusListCredential.statusListCredentials": "StatusListCredentialId",
    };
    this.spawn = pLimit(10);
  }

  async mapIds(target, path) {
    const result = Object.create(null);

    const [module, entity] = path.split(".");
    const type = this.paths[path];
    if (!type) {
      throw new Error(`No type for ${path}`);
    }
    const keys = await this.apis[target].api.query[module][entity].keys();
    for (const rawId of keys) {
      const id = this.types[type].from(rawId.toHuman()[0]);

      result[id] = String(CheqdAPI.Types[target][type].from(id));
    }

    return result;
  }

  async run() {
    await Promise.all([
      this.apis.mainnet.init({ address: "wss://mainnet-node.dock.io" }),
      this.apis.testnet.init({ address: "wss://knox-1.dock.io" }),
    ]);
    const data = await mergeAwait(
      Object.keys(this.paths).map(async (path) => ({
        [path.split(".")[1]]: await mergeAwait(
          ["mainnet", "testnet"].map(async (target) => ({
            [target]: await this.mapIds(target, path),
          }))
        ),
      }))
    );

    await Promise.all([
      this.apis.mainnet.disconnect(),
      this.apis.testnet.disconnect(),
    ]);

    return JSON.stringify(data, null, 2);
  }
}

async function main() {
  return await new Mappings().run();
}

main().then(console.log).catch(console.error);
