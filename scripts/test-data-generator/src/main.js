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
  DockStatusListCredentialId,
  CheqdTestnetStatusListCredentialId,
  CheqdTestnetAccumulatorId,
  AccumulatorPublicKey,
  DockAccumulatorId,
  PositiveAccumulator as StoredPositiveAccumulator,
  DockDid,
} from "@docknetwork/credential-sdk/types";
import {
  ensureInstanceOf,
  hexToU8a,
  randomAsHex,
  stringToHex,
  u8aToHex,
  ensureArray,
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
import { DockCoreModules } from "@docknetwork/dock-blockchain-modules";
import { CheqdCoreModules } from "@docknetwork/cheqd-blockchain-modules";
import { DockAPI } from "@docknetwork/dock-blockchain-api";
import { CheqdAPI } from "@docknetwork/cheqd-blockchain-api";
import { DirectSecp256k1HdWallet } from "@docknetwork/cheqd-blockchain-api/wallet";
import {
  initializeWasm,
  PositiveAccumulator,
} from "@docknetwork/crypto-wasm-ts";

class DIDDataGenerator {
  constructor(didKp, modules) {
    this.didKp = ensureInstanceOf(didKp, DidKeypair);
    this.modules = ensureInstanceOf(modules, DockCoreModules);
  }

  async document() {
    const { didKp } = this;
    const { did } = didKp;

    return DIDDocument.create(did, [didKp.didKey()]);
  }

  async statusListCredential() {
    const { didKp } = this;
    const { did, verificationMethodId } = didKp;
    const keyDoc = getKeyDoc(did, didKp, void 0, String(verificationMethodId));
    const dockId = DockStatusListCredentialId.random();
    const id = {
      dock: dockId,
      cheqd: new CheqdTestnetStatusListCredentialId.Class(did, dockId),
    };

    return {
      id,
      credential: await StatusList2021Credential.create(keyDoc, id.dock),
    };
  }

  async accumulator() {
    const { didKp } = this;
    const { did } = didKp;

    const totalMembers = 100;
    const members = [];
    const accumState = new InMemoryState();

    const label = stringToHex("accumulator-params-label");
    const params = Accumulator.generateParams(hexToU8a(label));
    const bytes1 = u8aToHex(params.bytes);
    const params1 = new AccumulatorParams(bytes1, label);
    const params1Id = await this.modules.accumulator.nextParamsId(did);

    const keypair = Accumulator.generateKeypair(params, randomAsHex(32));
    const bytes2 = u8aToHex(keypair.publicKey.bytes);
    const pk1 = new AccumulatorPublicKey(bytes2, [did, params1Id]);
    const pk1Id = await this.modules.accumulator.nextPublicKeyId(did);

    const accumulator = PositiveAccumulator.initialize(
      params,
      keypair.secretKey
    );

    for (let i = 1; i <= totalMembers; i++) {
      members.push(Accumulator.encodePositiveNumberAsAccumulatorMember(i));
    }
    await accumulator.addBatch(members, keypair.secretKey, accumState);

    const dockId = DockAccumulatorId.random();
    const id = {
      dock: dockId,
      cheqd: new CheqdTestnetAccumulatorId.Class(did, dockId),
    };
    const accumulated = this.modules.accumulator.constructor.accumulatedAsHex(
      accumulator.accumulated,
      AccumulatorType.VBPos
    );

    return {
      id,
      accumulator: new StoredPositiveAccumulator(
        new AccumulatorCommon(accumulated, [did, pk1Id])
      ),
      publicKey: {
        id: pk1Id,
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
  constructor(didKp, modules) {
    this.didKp = ensureInstanceOf(didKp, DidKeypair);

    for (const module of ensureArray(modules)) {
      ensureInstanceOf(module, AbstractCoreModules);
    }
    this.modules = modules;
  }

  async forEach(f) {
    return await Promise.all(this.modules.map(f));
  }

  async newDocument(document) {
    return await this.forEach((modules) =>
      modules.did.createDocument(document, this.didKp)
    );
  }

  async newStatusListCredential({ id, credential }) {
    return await this.forEach((modules) =>
      modules.statusListCredential.createStatusListCredential(
        modules instanceof DockCoreModules ? id.dock : id.cheqd,
        credential,
        this.didKp
      )
    );
  }

  async newAccumulator({ id, accumulator, params, publicKey }) {
    const { didKp } = this;
    const { did } = didKp;

    return await this.forEach(async (modules) => {
      await modules.accumulator.addParams(params.id, params.value, did, didKp);
      await modules.accumulator.addPublicKey(
        publicKey.id,
        publicKey.value,
        did,
        didKp
      );
      await modules.accumulator.addAccumulator(
        modules instanceof DockCoreModules ? id.dock : id.cheqd,
        accumulator,
        this.didKp
      );
    });
  }
}

async function main() {
  await initializeWasm();
  const [dock, cheqd] = await Promise.all([
    new DockAPI().init({ address: process.env.DOCK_ENDPOINT }),
    new CheqdAPI().init({
      url: process.env.CHEQD_ENDPOINT,
      network: process.env.CHEQD_NETWORK,
      wallet: await DirectSecp256k1HdWallet.fromMnemonic(
        process.env.CHEQD_MNEMONIC,
        {
          prefix: "cheqd",
        }
      ),
    }),
  ]);
  dock.setAccount(
    dock.keyring.addFromUri(process.env.DOCK_ACCOUNT_URI || "//Alice")
  );

  const kp = Ed25519Keypair.random();
  const didKp = new DidKeypair([process.env.DID || DockDid.random(), 1], kp);

  const generator = new DIDDataGenerator(didKp, new DockCoreModules(dock));
  const sender = new DIDTransactionSender(didKp, [
    new DockCoreModules(dock),
    new CheqdCoreModules(cheqd),
  ]);

  const doc = await generator.document();
  await sender.newDocument(doc);
  console.log(JSON.stringify(doc, null, 2));
  const cred = await generator.statusListCredential();
  await sender.newStatusListCredential(cred);
  console.log(JSON.stringify(cred, null, 2));
  const acc = await generator.accumulator();
  await sender.newAccumulator(acc);
  console.log(JSON.stringify(acc, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
