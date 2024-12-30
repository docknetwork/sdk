import {
  DockDid,
  CheqdTestnetDIDDocument,
  CheqdAccumulatorPublicKeyId,
  CheqdTestnetDid,
  CheqdTestnetBlobId,
  CheqdTestnetStatusListCredentialId,
  DockAccumulatorId,
  CheqdAccumulatorParamsId,
  DockBlobId,
  DockStatusListCredentialId,
  CheqdTestnetAccumulatorPublicKey,
  CheqdTestnetAccumulatorIdValue,
  CheqdParamsId,
} from "@docknetwork/credential-sdk/types";
import { DidKeypair } from "@docknetwork/credential-sdk/keypairs";
import { NoDIDError } from "@docknetwork/credential-sdk/modules/abstract/did";
import { NoBlobError } from "@docknetwork/credential-sdk/modules/abstract/blob";

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
  constructor(dock, modules, keyPairs, spawn) {
    this.dock = dock;
    this.spawn = spawn;
    this.keyPairs = keyPairs;
    this.modules = modules;
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

  async *migrateAccumulatorPublicKeys(did, keypair) {
    const {
      modules: { accumulator },
    } = this;
    const cheqdDid = CheqdTestnetDid.from(did);

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
      console.log(publicKey);
      console.log(CheqdTestnetAccumulatorPublicKey.from(publicKey));
    }
  }

  async *migrateAccumulatorParams(did, keypair) {
    const {
      modules: { accumulator },
    } = this;
    const cheqdDid = CheqdTestnetDid.from(did);

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
    const cheqdDid = CheqdTestnetDid.from(did);

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

  async fetchAccumulators() {
    const accs = Object.create(null);
    const ids = [
      ...(await this.dock.api.query.accumulator.accumulators.keys()),
    ].map((rawId) =>
      this.spawn(async () => {
        const id = DockAccumulatorId.from(rawId.toHuman()[0]);

        return [id, await this.modules.accumulator.getAccumulator(id)];
      })
    );

    for await (const [id, acc] of ids) {
      if (acc.keyRef == null) {
        console.log(
          `Accumulator ${id} doesn't have a key reference, thus will be skipped`
        );
        continue;
      }

      accs[acc.keyRef[0]] ??= [];
      accs[acc.keyRef[0]].push({ id, acc });
    }

    return accs;
  }

  async fetchBlobs() {
    const blobs = Object.create(null);
    const ids = [...(await this.dock.api.query.blobStore.blobs.keys())].map(
      (rawId) =>
        this.spawn(async () => {
          const id = DockBlobId.from(rawId.toHuman()[0]);

          return [id, await this.modules.blob.get(id)];
        })
    );

    for await (const [id, [owner, blob]] of ids) {
      blobs[owner] ??= [];
      blobs[owner].push({ id, blob });
    }

    return blobs;
  }

  async fetchStatusLists() {
    const lists = Object.create(null);
    const ids = [
      ...(await this.dock.api.query.statusListCredential.statusListCredentials.keys()),
    ].map((rawId) =>
      this.spawn(async () => {
        const id = DockStatusListCredentialId.from(rawId.toHuman()[0]);

        return [
          id,
          await this.modules.statusListCredential.modules[0].dockOnly.statusListCredential(
            id
          ),
        ];
      })
    );

    for await (const [id, { policy, statusListCredential }] of ids) {
      lists[[...policy.value][0]] ??= [];
      lists[[...policy.value][0]].push({
        id,
        statusListCredential: statusListCredential?.value?.list,
      });
    }

    return lists;
  }

  async *migrateAccumulators(did, accs, keypair) {
    for (const { id, acc } of accs[did] || []) {
      const cheqdId = new CheqdTestnetAccumulatorIdValue(did, id);
      if (await this.modules.accumulator.getAccumulator(cheqdId)) {
        console.log(`Accumulator ${cheqdId} already exists`);
      } else {
        yield await this.modules.accumulator.modules[1].cheqdOnly.tx.addAccumulator(
          new CheqdTestnetAccumulatorIdValue(did, id),
          acc.accumulator,
          keypair
        );
      }
    }
  }

  async *migrateStatusLists(did, statusLists, keypair) {
    for (const { id, statusListCredential } of statusLists[did] || []) {
      const cheqdId = CheqdTestnetStatusListCredentialId.from(id);

      if (
        await this.modules.statusListCredential.getStatusListCredential(cheqdId)
      ) {
        console.log(`Status list credential ${cheqdId} already exists`);
      } else {
        yield await this.modules.statusListCredential.createStatusListCredentialTx(
          cheqdId,
          statusListCredential,
          keypair
        );
      }
    }
  }

  async *migrateAttests(did, document, keypair) {
    const cheqdDid = CheqdTestnetDid.from(did);

    if (document.attest != null) {
      if (await this.module.attest.getAttests(cheqdDid)) {
        console.log(`Attests for ${cheqdDid} already exist`);
      } else {
        yield await this.module.attest.setClaimTx(
          cheqdDid,
          document.attest,
          keypair
        );
      }
    } else {
      console.log(`Did ${did} doesn't have attests`);
    }
  }

  async *migrateBlobs(did, blobs, keypair) {
    for (const { id, blob } of blobs[did] || []) {
      const cheqdId = CheqdTestnetBlobId.from(id);

      if (
        await nullIfThrows(() => this.modules.blob.get(cheqdId), NoBlobError)
      ) {
        console.log(`Blob ${cheqdId} already exists`);
      } else {
        yield await this.modules.blob.newTx(
          { id: CheqdTestnetBlobId.from(id), blob },
          keypair
        );
      }
    }
  }

  async *handleDid(rawDid, accs, blobs, statusLists) {
    const did = DockDid.from(rawDid.toHuman()[0]);
    const cheqdDid = CheqdTestnetDid.from(did);

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
        .toCheqd(void 0, CheqdTestnetDIDDocument);

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
    const cheqdDid = CheqdTestnetDid.from(did);

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
