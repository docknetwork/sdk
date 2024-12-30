import {
  DockBlobId,
  DockAccumulatorId,
  DockStatusListCredentialId,
} from "@docknetwork/credential-sdk/types";
import { DockAPI } from "@docknetwork/dock-blockchain-api";
import {
  DockBlobModule,
  DockAccumulatorModule,
  DockStatusListCredentialModule,
} from "@docknetwork/dock-blockchain-modules";
import pLimit from "p-limit";

const mergeAwait = async (objectPromises) => {
  const acc = {};
  for await (const obj of objectPromises) {
    Object.assign(acc, obj);
  }

  return acc;
};

export default class Mappings {
  constructor() {
    this.testnet = new DockAPI();
    this.mainnet = new DockAPI();
    this.spawn = pLimit(10);
  }

  async accumulators(dock) {
    const accMap = Object.create(null);
    const module = new DockAccumulatorModule(dock);

    const ids = [...(await dock.api.query.accumulator.accumulators.keys())].map(
      (rawId) =>
        this.spawn(async () => {
          const id = DockAccumulatorId.from(rawId.toHuman()[0]);
          return [id, await module.getAccumulator(id)];
        })
    );

    for await (const [id, acc] of ids) {
      if (acc.keyRef != null) {
        accMap[id.toEncodedString()] = String(acc.keyRef[0]);
      }
    }

    return accMap;
  }

  async blobs(dock) {
    const module = new DockBlobModule(dock);
    const blobs = Object.create(null);
    const ids = [...(await dock.api.query.blobStore.blobs.keys())].map(
      async (rawId) => {
        const id = DockBlobId.from(rawId.toHuman()[0]);
        return [id, await module.get(id)];
      }
    );

    for await (const [id, [owner]] of ids) {
      blobs[id.toEncodedString()] = String(owner);
    }

    return blobs;
  }

  async statusLists(dock) {
    const module = new DockStatusListCredentialModule(dock);
    const lists = Object.create(null);

    const ids = [
      ...(await dock.api.query.statusListCredential.statusListCredentials.keys()),
    ].map((rawId) =>
      this.spawn(async () => {
        const id = DockStatusListCredentialId.from(rawId.toHuman()[0]);

        return [id, await module.dockOnly.statusListCredential(id)];
      })
    );

    for await (const [id, { policy }] of ids) {
      lists[id.toEncodedString()] = String([...policy.value][0]);
    }

    return lists;
  }

  async run() {
    await Promise.all([
      this.mainnet.init({ address: "wss://mainnet-node.dock.io" }),
      this.testnet.init({ address: "wss://knox-1.dock.io" }),
    ]);
    const data = await mergeAwait(
      ["accumulators", "blobs", "statusLists"].map(async (entity) => ({
        [entity]: await mergeAwait(
          ["mainnet", "testnet"].map(async (key) => ({
            [key]: await this[entity](this[key]),
          }))
        ),
      }))
    );

    await Promise.all([this.mainnet.disconnect(), this.testnet.disconnect()]);

    return JSON.stringify(data, null, 2);
  }
}

async function main() {
  return await new Mappings().run();
}

main().then(console.log).catch(console.error);
