import {
  DockDid,
  CheqdAccumulatorPublicKeyId,
  CheqdAccumulatorParamsId,
  DockBlobId,
  DockAccumulatorId,
  DockStatusListCredentialId,
  CheqdParamsId,
} from '@docknetwork/credential-sdk/types';
import { maybeToJSONString } from '@docknetwork/credential-sdk/utils';
import {
  DidKeypair,
  Ed25519Keypair,
} from '@docknetwork/credential-sdk/keypairs';
import { NoDIDError } from '@docknetwork/credential-sdk/modules/abstract/did';
import { NoBlobError } from '@docknetwork/credential-sdk/modules/abstract/blob';
import {
  DockAccumulatorModule,
  DockStatusListCredentialModule,
  DockCoreModules,
} from '@docknetwork/dock-blockchain-modules';
import {
  CheqdAccumulatorModule,
  CheqdCoreModules,
} from '@docknetwork/cheqd-blockchain-modules';
import { MultiApiCoreModules } from '@docknetwork/credential-sdk/modules';
import { TypedUUID } from '@docknetwork/credential-sdk/types/generic';

const extractKeypair = (keypair) => {
  const kp = typeof keypair === 'function' ? keypair() : keypair;

  if (kp == null) {
    throw new Error('No keypair');
  }

  return kp;
};

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

const topologicalSort = (documents) => {
  // Step 1: Build the dependency graph
  const graph = new Map();
  const inDegree = new Map();

  for (const [did, { controller: controllers }] of documents) {
    const didStr = String(did);
    if (!graph.has(didStr)) graph.set(didStr, []);
    if (!inDegree.has(didStr)) inDegree.set(didStr, 0);

    for (const controller of controllers) {
      const controllerStr = String(controller);
      if (controllerStr === didStr || controllerStr.startsWith('did:key:')) {
        continue;
      }
      if (!graph.has(controllerStr)) graph.set(controllerStr, []);
      if (!inDegree.has(controllerStr)) inDegree.set(controllerStr, 0);

      graph.get(controllerStr).push(didStr);
      inDegree.set(didStr, (inDegree.get(didStr) || 0) + 1);
    }
  }

  // Step 2: Initialize a queue with nodes having no incoming edges
  const queue = [];
  for (const [did, degree] of inDegree.entries()) {
    if (degree === 0) queue.push(did);
  }

  // Step 3: Perform topological sort
  const sortedDIDs = [];
  while (queue.length > 0) {
    const current = queue.shift();
    sortedDIDs.push(current);

    for (const neighbor of graph.get(current)) {
      inDegree.set(neighbor, inDegree.get(neighbor) - 1);
      if (inDegree.get(neighbor) === 0) queue.push(neighbor);
    }
  }

  // Check for cycles (if not all nodes are sorted)
  if (sortedDIDs.length !== graph.size) {
    console.error(
      `Cycle detected in the DID dependency graph: ${sortedDIDs.length} != ${graph.size}`,
    );
  }

  // Step 4: Reorder the documents based on the sorted DIDs
  const didToDocument = new Map(
    documents.map(([did, doc]) => [String(did), doc]),
  );
  return sortedDIDs.map((did) => [did, didToDocument.get(did)]);
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
    const verMethod = document.verificationMethod.find(
      (method) => this.keyPairs[method.publicKey()],
    );
    if (verMethod != null) {
      return new DidKeypair(verMethod.id, this.keyPairs[verMethod.publicKey()]);
    }

    return null;
  }

  findKeypairOrAddTemporary(document) {
    const { id: did } = document;
    const cheqdDid = this.types.Did.from(did);
    let didKeypair = this.findKeypair(document);

    if (didKeypair == null) {
      const keyRef = [cheqdDid, document.nextKeyIndex()];
      const rand = Ed25519Keypair.random();
      this.keyPairs[rand.publicKey()] = rand;

      didKeypair = new DidKeypair(keyRef, rand);
      document.addKey(keyRef, didKeypair.didKey());

      console.log(
        `Temporary keypair used for ${document.id}: ${rand.publicKey()}`,
      );
    }

    return didKeypair;
  }

  async fetchAccumulators() {
    console.log('Fetching accumulators');

    const accs = Object.create(null);

    const ids = [
      ...(await this.dock.api.query.accumulator.accumulators.keys()),
    ].map((rawId) => this.spawn(async () => {
      const id = DockAccumulatorId.from(rawId.toHuman()[0]);
      try {
        const acc = await this.modules.accumulator.getAccumulator(
          id,
          true,
          true,
        );
        const history = await new DockAccumulatorModule(
          this.dock,
        ).dockOnly.accumulatorHistory(id);

        return [id, { acc, history }];
      } catch (error) {
        error.message = `Failed to fetch accumulator ${id}: ${error.message}`;

        throw error;
      }
    }));

    let total = 0;
    for await (const [id, { acc, history }] of ids) {
      if (acc.keyRef == null) {
        console.debug(
          `Accumulator ${id} doesn't have a key reference, thus will be skipped`,
        );
        continue;
      }

      accs[acc.keyRef[0]] ??= [];
      accs[acc.keyRef[0]].push({ id, acc, history });
      total++;
    }

    console.log(`Found ${total} accumulators`);

    return accs;
  }

  async fetchBlobs() {
    console.log('Fetching blobs');

    const blobs = Object.create(null);
    const ids = [...(await this.dock.api.query.blobStore.blobs.keys())].map(
      (rawId) => this.spawn(async () => {
        const id = DockBlobId.from(rawId.toHuman()[0]);

        return [id, await this.modules.blob.get(id)];
      }),
    );

    let total = 0;
    for await (const [id, [owner, blob]] of ids) {
      blobs[owner] ??= [];
      blobs[owner].push({ id, blob });
      total++;
    }

    console.log(`Found ${total} blobs`);

    return blobs;
  }

  async fetchDidDocuments() {
    console.log('Fetching DID documents');

    const dids = await this.dock.api.query.didModule.dids.keys();
    const documents = await Promise.all(
      dids.map((rawDid) => {
        const did = DockDid.from(rawDid.toHuman()[0]);

        return this.spawn(async () => {
          const document = await this.modules.did.getDocument(did);

          return [did, document];
        });
      }),
    );

    console.log(`Found ${documents.length} DIDs`);

    return Object.fromEntries(topologicalSort(documents));
  }

  async fetchStatusLists() {
    console.log('Fetching status list credentials');

    const lists = Object.create(null);
    const ids = [
      ...(await this.dock.api.query.statusListCredential.statusListCredentials.keys()),
    ].map((rawId) => this.spawn(async () => {
      const id = DockStatusListCredentialId.from(rawId.toHuman()[0]);

      return [
        id,
        await new DockStatusListCredentialModule(
          this.dock,
        ).dockOnly.statusListCredential(id),
      ];
    }));

    for await (const [id, { policy, statusListCredential }] of ids) {
      const [owner] = [...policy.value];

      lists[owner] ??= [];
      lists[owner].push({
        id,
        statusListCredential: statusListCredential?.value?.list,
      });
    }

    console.log(`Found ${ids.length} status list credentials`);

    return lists;
  }

  async *migrateAccumulatorPublicKeys(did, keypair) {
    const {
      modules: { accumulator },
    } = this;
    const cheqdDid = this.types.Did.from(did);

    const publicKeys = [...(await accumulator.getAllPublicKeysByDid(did))].sort(
      (a, b) => +a[0] - +b[0],
    );

    if (!publicKeys.length) {
      console.debug(`Did ${did} has no accumulator public keys`);
    }
    for (const [dockId, publicKey] of publicKeys) {
      const id = CheqdAccumulatorPublicKeyId.from(dockId);
      console.log(`Migrating accumulator public key ${id} for ${cheqdDid}`);

      if (await accumulator.getPublicKey(cheqdDid, id)) {
        console.log(`Accumulator public key ${cheqdDid} ${id} already exists`);
        continue;
      }

      yield await accumulator.addPublicKeyTx(
        id,
        publicKey,
        cheqdDid,
        extractKeypair(keypair),
      );
    }
  }

  async *migrateAccumulatorParams(did, keypair) {
    const {
      modules: { accumulator },
    } = this;
    const cheqdDid = this.types.Did.from(did);

    const params = [...(await accumulator.getAllParamsByDid(did))].sort(
      (a, b) => +a[0] - +b[0],
    );

    if (!params.length) {
      console.debug(`Did ${did} has no accumulator params`);
    }
    for (const [dockId, param] of params) {
      const id = CheqdAccumulatorParamsId.from(dockId);
      console.log(`Migrating accumulator params ${id} for ${cheqdDid}`);

      if (await accumulator.getParams(cheqdDid, id)) {
        console.log(`Accumulator params ${did} ${id} already exist`);
        continue;
      }

      yield await accumulator.addParamsTx(
        id,
        param,
        cheqdDid,
        extractKeypair(keypair),
      );
    }
  }

  async *migrateOffchainParams(did, keypair) {
    const {
      modules: { offchainSignatures },
    } = this;
    const cheqdDid = this.types.Did.from(did);

    const params = [...(await offchainSignatures.getAllParamsByDid(did))].sort(
      (a, b) => +a[0] - +b[0],
    );

    if (!params.length) {
      console.debug(`Did ${did} has no accumulator params`);
    }
    for (const [dockId, param] of params) {
      const id = CheqdParamsId.from(dockId);
      console.log(`Migrating offchain params ${id} for ${cheqdDid}`);

      let params = await offchainSignatures.getParams(cheqdDid, id);
      if (params) {
        console.log(`Params ${did} ${id} already exists`);
      } else {
        yield await offchainSignatures.addParamsTx(
          id,
          param,
          cheqdDid,
          extractKeypair(keypair),
        );

        params = await offchainSignatures.getParams(cheqdDid, id);
      }

      if (!params.eq(param)) {
        throw new Error(
          `Params ${did} ${id} differ: ${maybeToJSONString(
            params,
          )} and ${maybeToJSONString(param)}`,
        );
      }
    }
  }

  async *migrateAccumulators(did, accs, keypair) {
    const newHistory = async (cheqdId, history) => {
      const cheqdHistory = await new CheqdAccumulatorModule(
        this.cheqd,
      ).cheqdOnly.accumulatorHistory(cheqdId);
      if (!cheqdHistory) {
        return history;
      }

      if (
        !cheqdHistory.created.accumulator.eq(
          new this.types.StoredAccumulator(history.created.accumulator)
            .accumulator,
        )
      ) {
        throw new Error(
          `Accumulator migration failed for ${cheqdId} - new: ${maybeToJSONString(
            cheqdHistory.created.accumulator,
          )}, before: ${maybeToJSONString(
            history.created.accumulator,
          )}; ${maybeToJSONString(
            new this.types.StoredAccumulator(history.created.accumulator)
              .accumulator,
          )}`,
        );
      }

      for (
        let i = 0;
        i < Math.min(history.updates.length, cheqdHistory.updates.length);
        i++
      ) {
        for (const attr of [
          'additions',
          'removals',
          'witnessUpdateInfo',
          'accumulated',
        ]) {
          if (!history.updates[i][attr].eq(cheqdHistory.updates[i][attr])) {
            throw new Error(
              `Inconsistent history for ${cheqdId} in ${attr}: ${JSON.stringify(
                history.updates[i],
              )} and ${JSON.stringify(cheqdHistory.updates[i])}`,
            );
          }
        }

        const dockUpdateId = String(
          TypedUUID.fromDockIdent(cheqdId[1], String(history.updates[i].id)),
        );
        const cheqdUpdateId = cheqdHistory.updates[i].id;
        if (String(dockUpdateId) !== String(cheqdUpdateId)) {
          throw new Error(
            `Accumulator update ids don't match for ${cheqdId}: ${dockUpdateId} - ${cheqdUpdateId}`,
          );
        }
      }

      return new history.constructor(
        history.created,
        [...history.updates].slice(cheqdHistory.updates.length),
      );
    };

    for (const { id, acc, history } of accs[did] || []) {
      const cheqdId = new this.types.AccumulatorId.Class(did, id);
      console.log(`Migrating accumulator ${cheqdId}`);

      if (await this.modules.accumulator.getAccumulator(cheqdId)) {
        console.log(`Accumulator ${cheqdId} already exists`);
      } else {
        console.log(
          `Adding accumulator ${cheqdId} with value ${history.created.accumulated}`,
        );

        yield await new CheqdAccumulatorModule(
          this.cheqd,
        ).cheqdOnly.tx.addAccumulator(
          cheqdId,
          history.created,
          extractKeypair(keypair),
        );
      }

      let nextHistory = await newHistory(cheqdId, history);

      const last = nextHistory.created;
      const initialAccumulated = last.accumulated;
      for (const chunk of nextHistory.updates) {
        console.log(
          `Updating accumulator ${cheqdId} with value ${chunk.accumulated}`,
        );
        last.accumulated = chunk.accumulated;
        last.lastUpdatedAt = chunk.id;

        if (String(last.accumulated) !== String(chunk.accumulated)) {
          throw new Error('Failed to update accumulator');
        }

        yield await new CheqdAccumulatorModule(
          this.cheqd,
        ).cheqdOnly.tx.updateAccumulator(
          cheqdId,
          last,
          chunk,
          extractKeypair(keypair),
        );
      }
      last.accumulated = initialAccumulated;
      last.lastUpdatedAt = last.createdAt;

      nextHistory = await newHistory(cheqdId, history);

      if (nextHistory.updates.length) {
        throw new Error(`Failed to migrate history for ${cheqdId}`);
      }

      const cheqdAcc = await this.modules.accumulator.getAccumulator(
        cheqdId,
        true,
        true,
      );

      if (
        maybeToJSONString(cheqdAcc.accumulator)
        !== maybeToJSONString(this.types.Accumulator.from(acc.accumulator))
      ) {
        throw new Error(
          `Accumulator ${cheqdId} differs: ${maybeToJSONString(
            cheqdAcc.accumulator,
          )} and ${maybeToJSONString(
            this.types.Accumulator.from(acc.accumulator),
          )}`,
        );
      }
    }
  }

  async *migrateStatusLists(did, statusLists, keypair) {
    for (const { id, statusListCredential } of statusLists[did] || []) {
      const cheqdId = this.types.StatusListCredentialId.from(id);
      console.log(`Migrating status list ${cheqdId}`);

      if (
        await this.modules.statusListCredential.getStatusListCredential(cheqdId)
      ) {
        console.log(`Status list credential ${cheqdId} already exists`);
      } else {
        yield await this.modules.statusListCredential.createStatusListCredentialTx(
          cheqdId,
          statusListCredential,
          extractKeypair(keypair),
        );
      }

      const created = await this.modules.statusListCredential.getStatusListCredential(
        cheqdId,
      );

      if (
        maybeToJSONString(created) !== maybeToJSONString(statusListCredential)
      ) {
        throw new Error(
          `StatusListCredential migration failed for ${cheqdId} - new: ${maybeToJSONString(
            created,
          )}, before: ${maybeToJSONString(statusListCredential)}`,
        );
      }
    }
  }

  async *migrateAttests(did, document, keypair) {
    const cheqdDid = this.types.Did.from(did);

    if (document.attests != null) {
      console.log(`Migrating attests for ${cheqdDid}`);
      if (await this.module.attest.getAttests(cheqdDid)) {
        console.log(`Attests for ${cheqdDid} already exist`);

        return;
      }

      yield await this.module.attest.setClaimTx(
        cheqdDid,
        document.attests,
        extractKeypair(keypair),
      );

      const created = await this.module.attest.getAttests(cheqdDid);

      if (!created.eq(document.attests)) {
        throw new Error(
          `Attests migration failed for ${cheqdDid} - new: ${maybeToJSONString(
            created,
          )}, before: ${maybeToJSONString(document.attest)}`,
        );
      }
    } else {
      console.debug(`Did ${did} doesn't have attests`);
    }
  }

  async *migrateBlobs(did, blobs, keypair) {
    for (const { id, blob } of blobs[did] || []) {
      const cheqdId = this.types.BlobId.from(id);
      console.log(`Migrating blob ${cheqdId}`);

      if (
        await nullIfThrows(() => this.modules.blob.get(cheqdId), NoBlobError)
      ) {
        console.log(`Blob ${cheqdId} already exists`);
      } else {
        yield await this.modules.blob.newTx(
          { id: this.types.BlobId.from(id), blob },
          extractKeypair(keypair),
        );

        const [_, created] = await this.modules.blob.get(cheqdId);

        if (!created.eq(blob)) {
          throw new Error(
            `Blob migration failed for ${cheqdId} - new: ${maybeToJSONString(
              created,
            )}, before: ${maybeToJSONString(blob)}`,
          );
        }
      }
    }
  }

  async *handleDid(did, docs, accs, blobs, statusLists) {
    const cheqdDid = this.types.Did.from(did);

    let document = await nullIfThrows(
      () => this.modules.did.getDocument(cheqdDid),
      NoDIDError,
    );
    let keypair;

    if (document) {
      console.log(`${did} already exists on cheqd chain as ${cheqdDid}`);
      keypair = this.findKeypair(document);
    } else {
      document = docs[did];
      document.alsoKnownAs.push(did);
      document.removeController(did);

      const didKeys = document.controller.filter((did) => did.isDidMethodKey);
      if (didKeys.length) {
        console.log(`Removing did:key controllers for ${did}: ${didKeys}`);
      }

      document.controller = document.controller.filter(
        (did) => !did.isDidMethodKey,
      );
      const controllerKps = [...document.controller]
        .map((controller) => this.findKeypair(docs[controller]))
        .filter(Boolean);
      keypair = [this.findKeypairOrAddTemporary(document)].concat(
        controllerKps,
      );

      const { attests } = document;
      const cheqdDoc = document
        .setAttests(null)
        .toCheqd(this.types.DidDocument);

      yield await this.modules.did.createDocumentTx(cheqdDoc, keypair);

      document.setAttests(attests);

      const created = await this.modules.did.getDocument(cheqdDid);
      if (
        maybeToJSONString(created)
        !== maybeToJSONString(cheqdDoc.toDIDDocument())
      ) {
        throw new Error(
          `Docs don't match for ${cheqdDid}: created ${maybeToJSONString(
            created,
          )}, existing: ${maybeToJSONString(cheqdDoc.toDIDDocument())}`,
        );
      }
    }

    yield* this.migrateAttests(did, document, keypair);
    yield* this.migrateBlobs(did, blobs, keypair);
    yield* this.migrateAccumulatorParams(did, keypair);
    yield* this.migrateAccumulatorPublicKeys(did, keypair);
    yield* this.migrateAccumulators(did, accs, keypair);
    yield* this.migrateOffchainParams(did, keypair);
    yield* this.migrateStatusLists(did, statusLists, keypair);
  }

  async *txs() {
    const accs = await this.fetchAccumulators();
    const blobs = await this.fetchBlobs();
    const statusLists = await this.fetchStatusLists();
    const didDocs = await this.fetchDidDocuments();

    for (const did of Object.keys(didDocs)) {
      yield this.handleDid(
        DockDid.from(did),
        didDocs,
        accs,
        blobs,
        statusLists,
      );
    }
  }
}
