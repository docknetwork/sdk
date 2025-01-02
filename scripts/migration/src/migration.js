import {
  DockDid,
  CheqdAccumulatorPublicKeyId,
  CheqdAccumulatorParamsId,
  DockBlobId,
  DockAccumulatorId,
  DockStatusListCredentialId,
  CheqdParamsId,
} from "@docknetwork/credential-sdk/types";
import { maybeToJSONString } from "@docknetwork/credential-sdk/utils";
import { DidKeypair } from "@docknetwork/credential-sdk/keypairs";
import { NoDIDError } from "@docknetwork/credential-sdk/modules/abstract/did";
import { NoBlobError } from "@docknetwork/credential-sdk/modules/abstract/blob";
import {
  DockAccumulatorModule,
  DockStatusListCredentialModule,
} from "@docknetwork/dock-blockchain-modules";
import { CheqdAccumulatorModule } from "@docknetwork/cheqd-blockchain-modules";
import { DockCoreModules } from "@docknetwork/dock-blockchain-modules";
import { CheqdCoreModules } from "@docknetwork/cheqd-blockchain-modules";
import { MultiApiCoreModules } from "@docknetwork/credential-sdk/modules";
import pLimit from "p-limit";

const nullIfThrows = async (fn, Err) => {
  try {
    await fn();

    return await fn();
  } catch (err) {
    if (err instanceof Err) {
      return null;
    }

    throw err;
  }
};

export default class Migration {
  constructor(dock, cheqd, keyPairs, spawn) {
    this.dock = dock;
    this.cheqd = cheqd;
    this.spawn = spawn;
    this.keyPairs = keyPairs;

    this.modules = new MultiApiCoreModules([
      new DockCoreModules(dock),
      new CheqdCoreModules(cheqd),
    ]);
  }

  get types() {
    return this.cheqd.types();
  }

  findKeypair(document) {
    for (const kp of this.keyPairs) {
      const ref = document.verificationMethod.find((verMethod) =>
        verMethod.publicKey().eq(kp.publicKey())
      )?.id;

      if (ref != null) {
        return new DidKeypair(ref, kp);
      }
    }

    return null;
  }

  findKeypairOrAddTemporary(document) {
    const { id: did } = document;
    const cheqdDid = this.types.Did.from(did);
    let didKeypair = this.findKeypair(document);

    if (didKeypair == null) {
      const keyRef = [cheqdDid, document.nextKeyIndex()];

      didKeypair = new DidKeypair(keyRef, this.keyPairs.TEMPORARY);
      document.addKey(keyRef, didKeypair.didKey());

      console.log(`Temporary keypair used for ${document.id}`);
    }

    return didKeypair;
  }

  async fetchAccumulators() {
    console.log("Fetching accumulators");

    const accs = Object.create(null);

    const ids = [
      ...(await this.dock.api.query.accumulator.accumulators.keys()),
    ].map((rawId) =>
      this.spawn(async () => {
        const id = DockAccumulatorId.from(rawId.toHuman()[0]);
        try {
          const acc = await this.modules.accumulator.getAccumulator(
            id,
            true,
            true
          );
          const history = await new DockAccumulatorModule(
            this.dock
          ).dockOnly.accumulatorHistory(id);

          return [id, { acc, history }];
        } catch (error) {
          error.message = `Failed to fetch accumulator ${id}: ${error.message}`;

          throw error;
        }
      })
    );

    let total = 0;
    for await (const [id, { acc, history }] of ids) {
      if (acc.keyRef == null) {
        console.log(
          `Accumulator ${id} doesn't have a key reference, thus will be skipped`
        );
        continue;
      }

      accs[acc.keyRef[0]] ??= [];
      accs[acc.keyRef[0]].push({ id, acc, history });
      total++;
    }

    console.log(`Totally found ${total} accumulators`);

    return accs;
  }

  async fetchBlobs() {
    console.log("Fetching blobs");

    const blobs = Object.create(null);
    const ids = [...(await this.dock.api.query.blobStore.blobs.keys())].map(
      (rawId) =>
        this.spawn(async () => {
          const id = DockBlobId.from(rawId.toHuman()[0]);

          return [id, await this.modules.blob.get(id)];
        })
    );

    let total = 0;
    for await (const [id, [owner, blob]] of ids) {
      blobs[owner] ??= [];
      blobs[owner].push({ id, blob });
      total++;
    }

    console.log(`Totally found ${total} blobs`);

    return blobs;
  }

  async fetchStatusLists() {
    console.log("Fetching status list credentials");

    const lists = Object.create(null);
    const ids = [
      ...(await this.dock.api.query.statusListCredential.statusListCredentials.keys()),
    ].map((rawId) =>
      this.spawn(async () => {
        const id = DockStatusListCredentialId.from(rawId.toHuman()[0]);

        return [
          id,
          await new DockStatusListCredentialModule(
            this.dock
          ).dockOnly.statusListCredential(id),
        ];
      })
    );

    let total = 0;
    for await (const [id, { policy, statusListCredential }] of ids) {
      lists[[...policy.value][0]] ??= [];
      lists[[...policy.value][0]].push({
        id,
        statusListCredential: statusListCredential?.value?.list,
      });
      total++;
    }

    console.log(`Totally found ${total} status list credentials`);

    return lists;
  }

  async *migrateAccumulatorPublicKeys(did, keypair) {
    const {
      modules: { accumulator },
    } = this;
    const cheqdDid = this.types.Did.from(did);

    const publicKeys = [...(await accumulator.getAllPublicKeysByDid(did))].sort(
      (a, b) => +a[0] - +b[0]
    );

    if (!publicKeys.length) {
      console.log(`Did ${did} has no accumulator public keys`);
    }
    for (const [dockId, publicKey] of publicKeys) {
      const id = CheqdAccumulatorPublicKeyId.from(dockId);

      if (await accumulator.getPublicKey(cheqdDid, id)) {
        console.log(`Params ${cheqdDid} ${id} already exist`);
        continue;
      }

      yield await accumulator.addPublicKeyTx(id, publicKey, cheqdDid, keypair);
    }
  }

  async *migrateAccumulatorParams(did, keypair) {
    const {
      modules: { accumulator },
    } = this;
    const cheqdDid = this.types.Did.from(did);

    const params = [...(await accumulator.getAllParamsByDid(did))].sort(
      (a, b) => +a[0] - +b[0]
    );

    if (!params.length) {
      console.log(`Did ${did} has no accumulator params`);
    }
    for (const [dockId, param] of params) {
      const id = CheqdAccumulatorParamsId.from(dockId);

      if (await accumulator.getParams(cheqdDid, id)) {
        console.log(`Params ${did} ${id} already exist`);
        continue;
      }

      yield await accumulator.addParamsTx(id, param, cheqdDid, keypair);
    }
  }

  async *migrateOffchainParams(did, keypair) {
    const {
      modules: { offchainSignatures },
    } = this;
    const cheqdDid = this.types.Did.from(did);

    const params = [...(await offchainSignatures.getAllParamsByDid(did))].sort(
      (a, b) => +a[0] - +b[0]
    );

    if (!params.length) {
      console.log(`Did ${did} has no accumulator params`);
    }
    for (const [dockId, param] of params) {
      const id = CheqdParamsId.from(dockId);

      if (await offchainSignatures.getParams(cheqdDid, id)) {
        console.log(`Params ${did} ${id} already exist`);
        continue;
      }

      yield await offchainSignatures.addParamsTx(id, param, cheqdDid, keypair);
    }
  }

  async *migrateAccumulators(did, accs, keypair) {
    const newHistory = async (cheqdId, history) => {
      const cheqdHistory = await new CheqdAccumulatorModule(
        this.cheqd
      ).cheqdOnly.accumulatorHistory(cheqdId);

      for (
        let i = 0;
        i < Math.min(history.updates.length, cheqdHistory.updates.length);
        i++
      ) {
        for (const attr of [
          "additions",
          "removals",
          "witnessUpdateInfo",
          "newAccumulated",
        ]) {
          if (!history.updates[i][attr].eq(cheqdHistory.updates[i][attr])) {
            throw new Error(`Inconsistent history for ${cheqdId} in ${attr}`);
          }
        }
      }

      return {
        created: cheqdHistory.created,
        updates: cheqdHistory.updates.slice(history.updates.length),
      };
    };

    for (const { id, history } of accs[did] || []) {
      const cheqdId = new this.types.AccumulatorId.Class(did, id);
      if (await this.modules.accumulator.getAccumulator(cheqdId)) {
        console.log(`Accumulator ${cheqdId} already exists`);
      } else {
        yield await new CheqdAccumulatorModule(
          this.cheqd
        ).cheqdOnly.tx.addAccumulator(
          new this.types.AccumulatorId.Class(did, id),
          history.created,
          keypair
        );
      }

      let nextHistory = await newHistory(cheqdId, history);
      if (
        maybeToJSONString(nextHistory.created.accumulator) !==
        maybeToJSONString(
          new this.types.StoredAccumulator(history.created.accumulator)
            .accumulator
        )
      ) {
        throw new Error(
          `Accumulator migration failed for ${cheqdId} - new: ${maybeToJSONString(
            nextHistory.created.accumulator
          )}, before: ${maybeToJSONString(history.created.accumulator)}`
        );
      }

      const last = history.created;
      for (
        let i = 0;
        i < Math.min(history.updates.length, nextHistory.updates.length);
        i++
      ) {
        last.accumulated = history.updates[i].newAccumulated;

        await new CheqdAccumulatorModule(
          this.cheqd
        ).cheqdOnly.tx.updateAccumulator(
          new this.types.AccumulatorId.Class(did, id),
          last,
          history.updates[i],
          didKeypair
        );
      }

      nextHistory = await newHistory(cheqdId, history);

      if (nextHistory.updates.length) {
        throw new Error(`Failed to migrate history for ${cheqdId}`);
      }
    }
  }

  async *migrateStatusLists(did, statusLists, keypair) {
    for (const { id, statusListCredential } of statusLists[did] || []) {
      const cheqdId = this.types.StatusListCredentialId.from(id);

      if (
        await this.modules.statusListCredential.getStatusListCredential(cheqdId)
      ) {
        console.log(`Status list credential ${cheqdId} already exists`);

        continue;
      }

      yield await this.modules.statusListCredential.createStatusListCredentialTx(
        cheqdId,
        statusListCredential,
        keypair
      );

      const created =
        await this.modules.statusListCredential.getStatusListCredential(
          cheqdId
        );

      if (
        maybeToJSONString(created) !== maybeToJSONString(statusListCredential)
      ) {
        throw new Error(
          `StatusListCredential migration failed for ${cheqdId} - new: ${maybeToJSONString(
            created
          )}, before: ${maybeToJSONString(statusListCredential)}`
        );
      }
    }
  }

  async *migrateAttests(did, document, keypair) {
    const cheqdDid = this.types.Did.from(did);

    if (document.attest != null) {
      if (await this.module.attest.getAttests(cheqdDid)) {
        console.log(`Attests for ${cheqdDid} already exist`);

        return;
      }

      yield await this.module.attest.setClaimTx(
        cheqdDid,
        document.attest,
        keypair
      );

      const created = await this.module.attest.getAttests(cheqdDid);

      if (!created.eq(document.attest)) {
        throw new Error(
          `Attests migration failed for ${cheqdDid} - new: ${maybeToJSONString(
            created
          )}, before: ${maybeToJSONString(document.attest)}`
        );
      }
    } else {
      console.log(`Did ${did} doesn't have attests`);
    }
  }

  async *migrateBlobs(did, blobs, keypair) {
    for (const { id, blob } of blobs[did] || []) {
      const cheqdId = this.types.BlobId.from(id);

      if (
        await nullIfThrows(() => this.modules.blob.get(cheqdId), NoBlobError)
      ) {
        console.log(`Blob ${cheqdId} already exists`);
      } else {
        yield await this.modules.blob.newTx(
          { id: this.types.BlobId.from(id), blob },
          keypair
        );

        const [_, created] = await this.modules.blob.get(cheqdId);

        if (!created.eq(blob)) {
          throw new Error(
            `Blob migration failed for ${cheqdId} - new: ${maybeToJSONString(
              created
            )}, before: ${maybeToJSONString(blob)}`
          );
        }
      }
    }
  }

  async *handleDid(rawDid, accs, blobs, statusLists) {
    const did = DockDid.from(rawDid.toHuman()[0]);
    const cheqdDid = this.types.Did.from(did);

    let document = await nullIfThrows(
      () => this.modules.did.getDocument(cheqdDid),
      NoDIDError
    );
    let keypair;

    if (document) {
      console.log(`${did} already exists on cheqd chain as ${cheqdDid}`);
      keypair = this.findKeypair(document);

      if (keypair == null) {
        throw new Error(`No valid keypair found for ${cheqdDid}`);
      }
    } else {
      document = await this.modules.did.getDocument(did);
      document.alsoKnownAs.push(did);
      document.removeController(did);
      keypair = this.findKeypairOrAddTemporary(document);

      const cheqdDoc = document
        .setAttests(null)
        .toCheqd(void 0, this.types.DidDocument);

      yield await this.modules.did.createDocumentTx(cheqdDoc, keypair);
    }

    yield* this.migrateAttests(did, document, keypair);
    yield* this.migrateBlobs(did, blobs, keypair);
    yield* this.migrateAccumulatorParams(did, keypair);
    yield* this.migrateAccumulatorPublicKeys(did, keypair);
    yield* this.migrateAccumulators(did, accs, keypair);
    yield* this.migrateOffchainParams(did, keypair);
    yield* this.migrateStatusLists(did, statusLists, keypair);
  }

  async *removeDidKey(rawDid) {
    const did = DockDid.from(rawDid.toHuman()[0]);
    const cheqdDid = this.types.Did.from(did);

    const document = await this.modules.did.getDocument(cheqdDid);

    const kp = this.keyPairs.TEMPORARY;
    const ref = document.verificationMethod.find((verMethod) =>
      verMethod.publicKey().eq(kp.publicKey())
    )?.id;
    const didKp = this.findKeypair(document);

    if (ref != null) {
      console.log(`Removing temporary key from ${cheqdDid}`);
      document.removeKey(ref);

      yield await this.modules.did.updateDocumentTx(document, didKp);
    }
  }

  async *txs() {
    const accs = await this.fetchAccumulators();
    const blobs = await this.fetchBlobs();
    const statusLists = await this.fetchStatusLists();
    const dids = await this.dock.api.query.didModule.dids.keys();

    for (const did of dids) {
      yield this.handleDid(did, accs, blobs, statusLists);
    }
  }

  async *postTxs() {
    const dids = await this.dock.api.query.didModule.dids.keys();

    for (const did of dids) {
      yield this.removeDidKey(did);
    }
  }
}
