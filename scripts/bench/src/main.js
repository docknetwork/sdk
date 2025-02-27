import {
  DidKeypair,
  Ed25519Keypair,
} from "@docknetwork/credential-sdk/keypairs";
import {
  getKeyDoc,
  StatusList2021Credential,
} from "@docknetwork/credential-sdk/vc";
import {
  DIDDocument,
  AccumulatorCommon,
  CheqdTestnetStatusListCredentialId,
  AccumulatorPublicKey,
  CheqdTestnetAccumulatorId,
  PositiveAccumulator as StoredPositiveAccumulator,
  CheqdTestnetDid,
  BBSPublicKeyValue,
  DidKey,
} from "@docknetwork/credential-sdk/types";
import {
  ensureInstanceOf,
  hexToU8a,
  randomAsHex,
  stringToHex,
  u8aToHex,
  ensureArray,
  stringToU8a,
  chunks,
} from "@docknetwork/credential-sdk/utils";
import { InMemoryState } from "@docknetwork/crypto-wasm-ts/lib/accumulator/in-memory-persistence.js";
import {
  AbstractCoreModules,
  AccumulatorType,
} from "@docknetwork/credential-sdk/modules";
import {
  Accumulator,
  AccumulatorParams,
} from "@docknetwork/credential-sdk/crypto";
import { CheqdCoreModules } from "@docknetwork/cheqd-blockchain-modules";
import { CheqdMultiSenderAPI } from "@docknetwork/cheqd-blockchain-api";
import { DirectSecp256k1HdWallet } from "@docknetwork/cheqd-blockchain-api/wallet";
import {
  BBSKeypair,
  BBSSignatureParams,
  initializeWasm,
  PositiveAccumulator,
} from "@docknetwork/crypto-wasm-ts";
import { mergeAwait } from "@docknetwork/credential-sdk/utils";

class DIDDataGenerator {
  constructor(didKp, modules) {
    this.didKp = ensureInstanceOf(didKp, DidKeypair);
    this.modules = ensureInstanceOf(modules, CheqdCoreModules);
  }

  async genAcc(params, pkId, keypair) {
    const { didKp } = this;
    const { did } = didKp;

    const totalMembers = 1e4;
    const members = [];
    const accumState = new InMemoryState();
    const accumulator = PositiveAccumulator.initialize(
      params,
      keypair.secretKey
    );

    for (let i = 1; i <= totalMembers; i++) {
      members.push(Accumulator.encodePositiveNumberAsAccumulatorMember(i));
    }
    await accumulator.addBatch(members, keypair.secretKey, accumState);

    const accumulated = this.modules.accumulator.constructor.accumulatedAsHex(
      accumulator.accumulated,
      AccumulatorType.VBPos
    );

    return new StoredPositiveAccumulator(
      new AccumulatorCommon(accumulated, [did, pkId])
    );
  }

  async document() {
    const { didKp } = this;
    const { did } = didKp;

    return DIDDocument.create(did, [didKp.didKey()]);
  }

  async documentWithBBS() {
    const { didKp } = this;
    const { did } = didKp;

    const issuerBbsPlusKeypair = BBSKeypair.generate(
      BBSSignatureParams.generate(10, stringToU8a("test"))
    );

    return DIDDocument.create(did, [
      didKp.didKey(),
      new DidKey(new BBSPublicKeyValue(issuerBbsPlusKeypair.publicKey.bytes)),
    ]);
  }

  async statusListCredential() {
    const { didKp } = this;
    const { did, verificationMethodId } = didKp;
    const keyDoc = getKeyDoc(did, didKp, void 0, String(verificationMethodId));
    const id = CheqdTestnetStatusListCredentialId.random(did);
    return {
      id,
      credential: await StatusList2021Credential.create(keyDoc, id),
    };
  }

  async revokeStatusListCredential(id, length) {
    const { didKp } = this;
    const { did, verificationMethodId } = didKp;
    const keyDoc = getKeyDoc(did, didKp, void 0, String(verificationMethodId));

    return {
      id,
      credential: await StatusList2021Credential.create(keyDoc, id, {
        revokeIndices: new Set(
          Array.from({ length }, () => (Math.random() * 1e4) | 0)
        ),
      }),
    };
  }

  async accumulator() {
    const { didKp } = this;
    const { did } = didKp;

    const label = stringToHex("accumulator-params-label");
    const params = Accumulator.generateParams(hexToU8a(label));
    const bytes1 = u8aToHex(params.bytes);
    const params1 = new AccumulatorParams(bytes1, label);
    const [params1Id, pkId] = await Promise.all([
      this.modules.accumulator.nextParamsId(did),
      this.modules.accumulator.nextPublicKeyId(did),
    ]);

    const keypair = Accumulator.generateKeypair(params, randomAsHex(32));
    const bytes2 = u8aToHex(keypair.publicKey.bytes);
    const pk1 = new AccumulatorPublicKey(bytes2, [did, params1Id]);

    const id = CheqdTestnetAccumulatorId.random(did);
    const id1 = CheqdTestnetAccumulatorId.random(did);

    return {
      id,
      id1,
      accumulator: await this.genAcc(params, pkId, keypair),
      accumulator1: await this.genAcc(params, pkId, keypair),
      publicKey: {
        id: pkId,
        value: pk1,
      },
      params: {
        id: params1Id,
        value: params1,
      },
    };
  }
}

class DIDTransactionSender {
  constructor(size, modules) {
    this.size = size;
    for (const module of ensureArray(modules)) {
      ensureInstanceOf(module, AbstractCoreModules);
    }
    this.modules = modules;
  }

  async execute(title, data, f) {
    const moduleTxs = await mergeAwait(
      this.modules.map(async (modules) => ({
        [modules.constructor.name]: await Promise.all(
          data.map((item) => f(modules, item))
        ),
      }))
    );

    return await Promise.all(
      this.modules.map(async (modules) => {
        const txs = moduleTxs[modules.constructor.name].flat();

        return await trackTPS(
          title,
          chunks(txs, this.size).map(async (batch) => {
            await modules.signAndSend(batch);

            return { completed: batch.length };
          }),
          txs.length
        );
      })
    );
  }

  async newDocument(title, documents) {
    return await this.execute(title, documents, (modules, [document, didKp]) =>
      modules.did.createDocumentTx(document, didKp)
    );
  }

  async newStatusListCredential(title, data) {
    return await this.execute(
      title,
      data,
      (modules, [{ id, credential }, didKp]) =>
        modules.statusListCredential.createStatusListCredentialTx(
          id,
          credential,
          didKp
        )
    );
  }

  async updateStatusListCredential(title, data) {
    return await this.execute(
      title,
      data,
      (modules, [{ id, credential }, didKp]) =>
        modules.statusListCredential.updateStatusListCredentialTx(
          id,
          credential,
          didKp
        )
    );
  }

  async newAccumulatorOnly(title, data) {
    return await this.execute(
      title,
      data,
      (modules, [{ id1, accumulator1 }, didKp]) =>
        modules.accumulator.addAccumulatorTx(id1, accumulator1, didKp)
    );
  }

  async newAccumulator(title, data) {
    return await this.execute(
      title,
      data,
      async (modules, [{ id, accumulator, params, publicKey }, didKp]) =>
        Promise.all([
          modules.accumulator.addParamsTx(
            params.id,
            params.value,
            didKp.did,
            didKp
          ),
          modules.accumulator.addPublicKeyTx(
            publicKey.id,
            publicKey.value,
            didKp.did,
            didKp
          ),
          modules.accumulator.addAccumulatorTx(id, accumulator, didKp),
        ])
    );
  }
}

async function main(size) {
  await initializeWasm();
  const sendersCount = (300 / size) | 0;
  const cheqd = await new CheqdMultiSenderAPI({
    count: sendersCount,
    amountPerSender: ((50e9 * 1000) / sendersCount) * 1.5,
  }).init({
    url: process.env.CHEQD_ENDPOINT,
    network: process.env.CHEQD_NETWORK,
    wallet: await DirectSecp256k1HdWallet.fromMnemonic(
      process.env.CHEQD_MNEMONIC,
      {
        prefix: "cheqd",
      }
    ),
  });

  const buildPrefix = (str) =>
    `With ${sendersCount} senders and ${size} tx per batch -> ${str}`;

  try {
    const sender = new DIDTransactionSender(
      size,
      [new CheqdCoreModules(cheqd)],
      cheqd
    );
    const dids = Array.from({ length: 1000 }, () => {
      const kp = new DidKeypair(
        [CheqdTestnetDid.random(), 1],
        Ed25519Keypair.random()
      );

      return {
        generator: new DIDDataGenerator(kp, new CheqdCoreModules(cheqd)),
      };
    });

    const docs = await Promise.all(
      dids.map(async ({ generator }) => [
        await generator.document(),
        generator.didKp,
      ])
    );

    await sender.newDocument(
      buildPrefix("Create DID document with single Ed25519 key"),
      docs
    );

    docs.length = 0;

    const accs = await Promise.all(
      dids.map(async ({ generator }) => [
        await generator.accumulator(),
        generator.didKp,
      ])
    );

    await sender.newAccumulatorOnly(buildPrefix("Create Accumulator"), accs);

    await sender.newAccumulator(
      buildPrefix(
        "Create Accumulator Params, create Accumulator Public Key, create Accumulator"
      ),
      accs
    );

    accs.length = 0;

    const creds = await Promise.all(
      dids.map(async ({ generator }) => [
        await generator.statusListCredential(),
        generator.didKp,
      ])
    );

    await sender.newStatusListCredential(
      buildPrefix("Create StatusListCredential"),
      creds
    );

    const revokedCreds = await Promise.all(
      dids.map(async ({ generator }, idx) => [
        await generator.revokeStatusListCredential(
          creds[idx][0].id,
          Math.random() * 1e4
        ),
        generator.didKp,
      ])
    );

    await sender.updateStatusListCredential(
      buildPrefix("Revoke from StatusListCredential"),
      revokedCreds
    );
  } finally {
    await cheqd.disconnect();
  }
}

/**
 * Tracks the resolution rate of an array of promises
 * @param {Promise[]} promises - Array of promises to track
 * @returns {Promise<number>} - Promise that resolves to the average resolutions per second
 */
function trackTPS(prefix, promises, total) {
  if (!Array.isArray(promises) || total === 0) {
    return Promise.resolve(0);
  }

  // Track start time and completed count
  const startTime = Date.now();
  let completedCount = 0;

  // Create a logging function
  const logProgress = () => {
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const currentRate = completedCount / elapsedSeconds;
    //console.log(`${completedCount}/${total} txs completed`);
    //console.log(`${prefix}: ${currentRate.toFixed(2)} TPS`);
  };

  // Set up periodic logging (every second)
  const loggingInterval = setInterval(logProgress, 1000);

  // Create a wrapper for each promise to count completions
  const wrappedPromises = promises.map((promise) =>
    Promise.resolve(promise)
      .then((result) => {
        completedCount += result.completed;
        return result;
      })
      .catch((error) => {
        throw error;
      })
  );

  // Wait for all promises to complete
  return Promise.all(wrappedPromises).finally(() => {
    // Clean up the interval timer
    clearInterval(loggingInterval);

    // Log the final progress
    logProgress();

    // Calculate the final rate
    const totalTime = (Date.now() - startTime) / 1000;
    const finalRate = total / totalTime;
    console.log(`${prefix} average: ${finalRate.toFixed(2)} TPS`);

    return finalRate;
  });
}

for (const size of [1, 10, 25, 50, 100]) {
  await main(size);
}
