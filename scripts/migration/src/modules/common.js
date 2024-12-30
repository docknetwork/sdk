import { DidKeypair } from "@docknetwork/credential-sdk/keypairs";
import { CheqdTestnetDid } from "@docknetwork/credential-sdk/types";
import { maybeToJSONString } from "@docknetwork/credential-sdk/utils";

export class Base {
  constructor(dock, modules, keyPairs, spawn) {
    this.dock = dock;
    this.spawn = spawn;
    this.keyPairs = keyPairs;
    this.modules = modules;
  }

  parse(entry) {
    return entry;
  }

  async cheqdDocument(did) {
    if (this.dids[did] == null) {
      this.dids[did] = await this.modules.did.getDocument(
        CheqdTestnetDid.from(did)
      );
    }

    return this.dids[did];
  }

  async *fetchAndFilter() {
    const entries = await this.keys();
    console.log(
      `Total items count for \`${this.constructor.name}\`: ${entries.length}`
    );
    const parsedEntries = entries.map((entry) => this.parse(entry));
    const onlyNonExistent = parsedEntries.map((entry) =>
      this.spawn(async () => {})
    );

    let migrated = 0;
    for await (const maybeItem of onlyNonExistent) {
      if (maybeItem != null) {
        yield maybeItem;
        migrated++;
      }
    }

    console.log(`Migrated ${migrated} items by ${this.constructor.name}`);
  }

  async *fetchAndFilterWithKeypair() {
    for (const item of this.fetchAndFilter()) {
      const did = this.keyDid(item);
      const doc = await this.cheqdDocument(did);
      if (doc == null) {
        console.log(
          `Skipping ${maybeToJSONString(
            item
          )} because ${did} doesn't exist on cheqd`
        );
        continue;
      }

      const keypair = this.findKeypair(doc);
      if (keypair == null) {
        throw new Error(`No keypair for ${did}`);
      }

      yield { item, keypair };
    }
  }

  findKeypair(document) {
    const { id: did } = document;
    const cheqdDid = CheqdTestnetDid.from(did);

    for (const kp of this.keyPairs) {
      const idx = document.verificationMethod.find(
        (verMethod) =>
          verMethod.publicKey().eq(kp.publicKey()) && verMethod.id.did.eq(did)
      )?.id?.index;

      if (idx != null) {
        return new DidKeypair([cheqdDid, idx], kp);
      }
    }

    return null;
  }

  findKeypairOrAddTemporary(document) {
    const { id: did } = document;
    const cheqdDid = CheqdTestnetDid.from(did);
    let didKeypair = this.findKeypair(document);

    if (didKeypair == null) {
      const keyRef = [cheqdDid, document.nextKeyIndex()];

      didKeypair = new DidKeypair(keyRef, this.keyPairs.TEMPORARY);
      document.addKey(keyRef, didKeypair.didKey());

      console.log(`Temporary keypair used for ${document.id}`);
    }

    return didKeypair;
  }
}
