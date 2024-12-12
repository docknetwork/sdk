import {
  randomAsHex,
  hexToU8a,
  stringToHex,
  u8aToHex,
} from "@docknetwork/credential-sdk/utils";
import {
  initializeWasm,
  Accumulator,
  PositiveAccumulator,
  VBWitnessUpdateInfo,
  AccumulatorParams,
  KBUniversalAccumulator,
  KBUniversalMembershipWitnessUpdateInfo,
} from "@docknetwork/crypto-wasm-ts";
import {
  InMemoryKBUniversalState,
  InMemoryState,
} from "@docknetwork/crypto-wasm-ts/lib/accumulator/in-memory-persistence";
import { DockAPI } from "@docknetwork/dock-blockchain-api";
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
} from "../../test-constants";
import { DockDid, DockAccumulatorId } from "@docknetwork/credential-sdk/types";

import { AccumulatorType } from "@docknetwork/credential-sdk/modules/abstract/accumulator";
import { AbstractAccumulatorModule } from "@docknetwork/credential-sdk/modules";
import { getAllEventsFromBlock } from "@docknetwork/dock-blockchain-api/utils/chain-ops";
import { registerNewDIDUsingPair } from "../helpers";
import {
  Ed25519Keypair,
  DidKeypair,
} from "@docknetwork/credential-sdk/keypairs";
import { DockAccumulatorPublicKeyRef } from "@docknetwork/credential-sdk/types";
import { ArrayOfByteArrays } from "../../../src/accumulator/actions";
import { DockAccumulatorModule } from "../../../src";

describe("Accumulator Module", () => {
  const dock = new DockAPI();
  const chainModule = new DockAccumulatorModule(dock);
  let account;

  const seed1 = randomAsHex(32);
  const seed2 = randomAsHex(32);

  const did1 = DockDid.random();
  const did2 = DockDid.random();
  const pair1 = new DidKeypair([did1, 1], new Ed25519Keypair(seed1));
  const pair2 = new DidKeypair([did2, 1], new Ed25519Keypair(seed2));

  const chainModuleClass = DockAccumulatorModule;

  const seedAccum = randomAsHex(32);

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });

    account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);

    await registerNewDIDUsingPair(dock, did1, pair1);
    await registerNewDIDUsingPair(dock, did2, pair2);
    await initializeWasm();
  }, 20000);

  test("Can create new params", async () => {
    let label = stringToHex("accumulator-params-label");
    let params = Accumulator.generateParams(hexToU8a(label));
    const bytes1 = u8aToHex(params.bytes);
    const params1 = chainModuleClass.prepareAddParameters(bytes1, label);
    await chainModule.addParams(
      await chainModule.nextParamsId(did1),
      params1,
      did1,
      pair1
    );
    const paramsWritten1 = await chainModule.getParams(
      did1,
      await chainModule.lastParamsId(did1)
    );
    expect(paramsWritten1.bytes).toEqual(params1.bytes);
    expect(paramsWritten1.label).toEqual(params1.label);

    const queriedParams1 = await chainModule.getParams(did1, 1);
    expect(paramsWritten1.eq(queriedParams1)).toBe(true);

    label = stringToHex("some label");
    params = Accumulator.generateParams(hexToU8a(label));
    const bytes2 = u8aToHex(params.bytes);
    const params2 = chainModuleClass.prepareAddParameters(bytes2);
    await chainModule.addParams(
      await chainModule.nextParamsId(did2),
      params2,
      did2,
      pair2
    );
    const paramsWritten2 = await chainModule.getParams(
      did2,
      await chainModule.lastParamsId(did2)
    );
    expect(paramsWritten2.bytes).toEqual(params2.bytes);
    expect(paramsWritten2.label).toBe(null);

    const queriedParams2 = await chainModule.getParams(did2, 1);
    expect(paramsWritten2.eq(queriedParams2)).toBe(true);

    label = stringToHex("some label");
    params = Accumulator.generateParams(hexToU8a(label));
    const bytes3 = u8aToHex(params.bytes);
    const params3 = chainModuleClass.prepareAddParameters(bytes3);
    await chainModule.addParams(
      await chainModule.nextParamsId(did1),
      params3,
      did1,
      pair1
    );
    const paramsWritten3 = await chainModule.getParams(
      did1,
      await chainModule.lastParamsId(did1)
    );
    expect(paramsWritten3.bytes).toEqual(params3.bytes);
    expect(paramsWritten3.label).toBe(null);

    const queriedParams3 = await chainModule.getParams(did1, 2);
    expect(paramsWritten3.eq(queriedParams3)).toBe(true);

    const paramsByDid1 = [
      ...(await chainModule.getAllParamsByDid(did1)).values(),
    ];
    expect(paramsByDid1[0].eq(paramsWritten1)).toBe(true);
    expect(paramsByDid1[1].eq(paramsWritten3)).toBe(true);

    const paramsByDid2 = [
      ...(await chainModule.getAllParamsByDid(did2)).values(),
    ];
    expect(paramsByDid2[0].eq(paramsWritten2)).toBe(true);
  }, 30000);

  test("Can create public keys", async () => {
    const params = Accumulator.generateParams();
    let keypair = Accumulator.generateKeypair(params);
    const bytes1 = u8aToHex(keypair.publicKey.bytes);
    const pk1 = chainModuleClass.prepareAddPublicKey(bytes1);
    await chainModule.addPublicKey(
      await chainModule.nextPublicKeyId(did2),
      pk1,
      did1,
      pair1
    );

    const queriedPk1 = await chainModule.getPublicKey(did1, 1);
    expect(queriedPk1.bytes).toEqual(pk1.bytes);
    expect(queriedPk1.paramsRef).toBe(null);

    const params1 = await chainModule.getParams(did1, 1);
    const aparams1 = new AccumulatorParams(params1.bytes.bytes);
    keypair = Accumulator.generateKeypair(aparams1, hexToU8a(seedAccum));
    const bytes2 = u8aToHex(keypair.publicKey.bytes);
    const pk2 = chainModuleClass.prepareAddPublicKey(bytes2, [did1, 1]);
    await chainModule.addPublicKey(
      await chainModule.nextPublicKeyId(did2),
      pk2,
      did2,
      pair2
    );

    const queriedPk2 = await chainModule.getPublicKey(did2, 1);
    expect(queriedPk2.bytes).toEqual(pk2.bytes);
    expect(
      queriedPk2.paramsRef.eq(new DockAccumulatorPublicKeyRef(did1, 1))
    ).toBe(true);

    const queriedPk2WithParams = await chainModule.getPublicKey(did2, 1, true);
    expect(queriedPk2WithParams.params.eq(params1)).toBe(true);

    const params2 = await chainModule.getParams(did1, 2);
    const aparams2 = new AccumulatorParams(params2.bytes.bytes);
    keypair = Accumulator.generateKeypair(aparams2);
    const bytes3 = u8aToHex(keypair.publicKey.bytes);
    const pk3 = chainModuleClass.prepareAddPublicKey(bytes3, [did1, 2]);
    await chainModule.addPublicKey(
      await chainModule.nextPublicKeyId(did2),
      pk3,
      did2,
      pair2
    );

    const queriedPk3 = await chainModule.getPublicKey(did2, 2);
    expect(queriedPk3.bytes).toEqual(pk3.bytes);
    expect(
      queriedPk3.paramsRef.eq(new DockAccumulatorPublicKeyRef(did1, 2))
    ).toBe(true);

    const queriedPk3WithParams = await chainModule.getPublicKey(did2, 2, true);
    expect(queriedPk3WithParams.params.eq(params2)).toBe(true);

    const pksByDid1 = [
      ...(await chainModule.getAllPublicKeysByDid(did1)).values(),
    ];
    expect(pksByDid1[0].toJSON()).toEqual(queriedPk1.toJSON());

    const pksByDid2 = [
      ...(await chainModule.getAllPublicKeysByDid(did2)).values(),
    ];
    expect(pksByDid2[0].toJSON()).toEqual(queriedPk2.toJSON());
    expect(pksByDid2[1].toJSON()).toEqual(queriedPk3.toJSON());

    const pksWithParamsByDid2 = [
      ...(await chainModule.getAllPublicKeysByDid(did2, true)).values(),
    ];
    expect(pksWithParamsByDid2[0].toJSON()).toEqual(
      queriedPk2WithParams.toJSON()
    );
    expect(pksWithParamsByDid2[1].toJSON()).toEqual(
      queriedPk3WithParams.toJSON()
    );
  }, 30000);

  async function checkAddRemove(keyId) {
    const id1 = DockAccumulatorId.random(did1);
    const accumulated1 = randomAsHex(100);
    await chainModule.addPositiveAccumulator(
      id1,
      accumulated1,
      [did1, keyId],
      pair1
    );

    const id2 = DockAccumulatorId.random(did2);
    const accumulated2 = randomAsHex(100);
    const maxSize = 100000;
    await chainModule.addUniversalAccumulator(
      id2,
      accumulated2,
      [did2, keyId],
      maxSize,
      pair2
    );

    const accum1 = await chainModule.getAccumulator(id1, false);
    expect(accum1.created > 0).toBe(true);
    expect(accum1.lastModified > 0).toBe(true);
    expect(accum1.created).toEqual(accum1.lastModified);
    expect(accum1.type).toEqual("positive");
    expect(accum1.accumulated.value).toEqual(accumulated1);
    expect(accum1.keyRef.eq(new DockAccumulatorPublicKeyRef(did1, keyId))).toBe(
      true
    );
    expect(accum1.publicKey).toBeUndefined();

    const accum2 = await chainModule.getAccumulator(id2, false);
    expect(accum2.created > 0).toBe(true);
    expect(accum2.lastModified > 0).toBe(true);
    expect(accum2.created).toEqual(accum2.lastModified);
    expect(accum2.type).toEqual("universal");
    expect(accum2.accumulated.value).toEqual(accumulated2);
    expect(accum2.keyRef.eq(new DockAccumulatorPublicKeyRef(did2, keyId))).toBe(
      true
    );
    expect(accum2.publicKey).toBeUndefined();

    const keyWithParams =
      keyId > 0 ? await chainModule.getPublicKey(did2, keyId, true) : null;
    const accum2WithKeyAndParams = await chainModule.getAccumulator(
      id2,
      true,
      true
    );
    expect(accum2WithKeyAndParams.created > 0).toBe(true);
    expect(accum2WithKeyAndParams.lastModified > 0).toBe(true);
    expect(accum2WithKeyAndParams.created).toEqual(
      accum2WithKeyAndParams.lastModified
    );
    expect(accum2WithKeyAndParams.type).toEqual("universal");
    expect(accum2WithKeyAndParams.accumulated.value).toEqual(accumulated2);
    expect(
      accum2WithKeyAndParams.keyRef.eq(
        new DockAccumulatorPublicKeyRef(did2, keyId)
      )
    ).toBe(true);
    if (keyId > 0) {
      expect(accum2WithKeyAndParams.publicKey.eq(keyWithParams)).toBe(true);
    } else {
      expect(accum2WithKeyAndParams.publicKey).toEqual(null);
    }

    await chainModule.removeAccumulator(id1, pair1);
    expect(await chainModule.getAccumulator(id1, false)).toEqual(null);

    await chainModule.removeAccumulator(id2, pair2);
    expect(await chainModule.getAccumulator(id2, false)).toEqual(null);

    const id3 = DockAccumulatorId.random(did2);
    const accumulated3 = randomAsHex(100);
    await chainModule.addKBUniversalAccumulator(
      id3,
      accumulated3,
      [did2, keyId],
      pair2
    );

    const accum3 = await chainModule.getAccumulator(id3, false);
    expect(accum3.created > 0).toBe(true);
    expect(accum3.lastModified > 0).toBe(true);
    expect(accum3.created).toEqual(accum3.lastModified);
    expect(accum3.type).toEqual("kbUniversal");
    expect(accum3.accumulated.value).toEqual(accumulated3);
    expect(accum3.keyRef.eq(new DockAccumulatorPublicKeyRef(did2, keyId))).toBe(
      true
    );
    expect(accum3.publicKey).toBeUndefined();

    await chainModule.removeAccumulator(id3, pair2);
    expect(await chainModule.getAccumulator(id3, false)).toEqual(null);
  }

  async function checkUpdate(keyId) {
    async function check(typ) {
      const accumState =
        typ === 0 ? new InMemoryState() : new InMemoryKBUniversalState();

      const queriedPkWithParams =
        keyId > 0 ? await chainModule.getPublicKey(did2, keyId, true) : null;
      const aparams =
        keyId > 0
          ? new AccumulatorParams(queriedPkWithParams.params.bytes.bytes)
          : Accumulator.generateParams();
      const keypair = Accumulator.generateKeypair(aparams, hexToU8a(seedAccum));
      let accumulator;
      const members = [
        Accumulator.encodePositiveNumberAsAccumulatorMember(25),
        Accumulator.encodePositiveNumberAsAccumulatorMember(31),
        Accumulator.encodePositiveNumberAsAccumulatorMember(7),
        Accumulator.encodePositiveNumberAsAccumulatorMember(93),
        Accumulator.encodePositiveNumberAsAccumulatorMember(50),
      ];
      if (typ === 0) {
        accumulator = PositiveAccumulator.initialize(
          aparams,
          keypair.secretKey
        );
      } else {
        const domain = [];
        for (let i = 1; i <= 100; i++) {
          domain.push(Accumulator.encodePositiveNumberAsAccumulatorMember(i));
        }
        accumulator = await KBUniversalAccumulator.initialize(
          domain,
          aparams,
          keypair.secretKey,
          accumState
        );
      }

      const member1 = members.pop();
      await accumulator.add(member1, keypair.secretKey, accumState);

      const accumulated1 = AbstractAccumulatorModule.accumulatedAsHex(
        accumulator.accumulated,
        typ === 0 ? AccumulatorType.VBPos : AccumulatorType.KBUni
      );
      const id = DockAccumulatorId.random(did2);
      if (typ === 0) {
        await chainModule.addPositiveAccumulator(
          id,
          accumulated1,
          [did2, keyId],
          pair2
        );
      } else {
        await chainModule.addKBUniversalAccumulator(
          id,
          accumulated1,
          [did2, keyId],
          pair2
        );
      }

      const accum1 = await chainModule.getAccumulator(id, false);
      expect(accum1.accumulated.value).toEqual(accumulated1);

      const accumulated2 = AbstractAccumulatorModule.accumulatedAsHex(
        accumulator.accumulated,
        typ === 0 ? AccumulatorType.VBPos : AccumulatorType.KBUni
      );
      await (typ === 0
        ? chainModule.updatePositiveAccumulator
        : chainModule.updateKBUniversalAccumulator
      ).call(chainModule, id, accumulated2, {}, [did2, keyId], pair2);
      const accum2 = await chainModule.getAccumulator(id, false);
      expect(accum2.accumulated.value).toEqual(accumulated2);

      const member2 = members.pop();
      await accumulator.add(member2, keypair.secretKey, accumState);

      const member3 = members.pop();
      await accumulator.add(member3, keypair.secretKey, accumState);

      await accumulator.remove(member1, keypair.secretKey, accumState);

      const witUpdCls =
        typ === 0
          ? VBWitnessUpdateInfo
          : KBUniversalMembershipWitnessUpdateInfo;

      const accumulated3 = AbstractAccumulatorModule.accumulatedAsHex(
        accumulator.accumulated,
        typ === 0 ? AccumulatorType.VBPos : AccumulatorType.KBUni
      );
      const additions1 = [u8aToHex(member2), u8aToHex(member3)];
      const removals1 = [u8aToHex(member1)];
      const witUpd1 = u8aToHex(
        witUpdCls.new(
          AbstractAccumulatorModule.accumulatedFromHex(
            accumulated2,
            typ === 0 ? AccumulatorType.VBPos : AccumulatorType.KBUni
          ),
          [member2, member3],
          [member1],
          keypair.secretKey
        ).value
      );
      await (typ === 0
        ? chainModule.updatePositiveAccumulator
        : chainModule.updateKBUniversalAccumulator
      ).call(
        chainModule,
        id,
        accumulated3,
        {
          additions: additions1,
          removals: removals1,
          witnessUpdateInfo: witUpd1,
        },
        [did2, keyId],
        pair2
      );
      const accum3 = await chainModule.getAccumulator(id, false);
      expect(accum3.accumulated.value).toEqual(accumulated3);

      const member4 = members.pop();
      await accumulator.add(member4, keypair.secretKey, accumState);

      const member5 = members.pop();
      await accumulator.add(member5, keypair.secretKey, accumState);

      const accumulated4 = AbstractAccumulatorModule.accumulatedAsHex(
        accumulator.accumulated,
        typ === 0 ? AccumulatorType.VBPos : AccumulatorType.KBUni
      );
      const additions2 = [u8aToHex(member4), u8aToHex(member5)];
      const witUpd2 = u8aToHex(
        witUpdCls.new(
          AbstractAccumulatorModule.accumulatedFromHex(
            accumulated3,
            typ === 0 ? AccumulatorType.VBPos : AccumulatorType.KBUni
          ),
          [member4, member5],
          [],
          keypair.secretKey
        ).value
      );
      await (typ === 0
        ? chainModule.updatePositiveAccumulator
        : chainModule.updateKBUniversalAccumulator
      ).call(
        chainModule,
        id,
        accumulated4,
        { additions: additions2, witnessUpdateInfo: witUpd2 },
        [did2, keyId],
        pair2
      );
      const accum4 = await chainModule.getAccumulator(id, false);
      expect(accum4.accumulated.value).toEqual(accumulated4);

      await accumulator.remove(member2, keypair.secretKey, accumState);
      await accumulator.remove(member4, keypair.secretKey, accumState);

      const accumulated5 = AbstractAccumulatorModule.accumulatedAsHex(
        accumulator.accumulated,
        typ === 0 ? AccumulatorType.VBPos : AccumulatorType.KBUni
      );
      const removals3 = [u8aToHex(member2), u8aToHex(member4)];
      const witUpd3 = u8aToHex(
        witUpdCls.new(
          AbstractAccumulatorModule.accumulatedFromHex(
            accumulated4,
            typ === 0 ? AccumulatorType.VBPos : AccumulatorType.KBUni
          ),
          [],
          [member2, member4],
          keypair.secretKey
        ).value
      );
      await (typ === 0
        ? chainModule.updatePositiveAccumulator
        : chainModule.updateKBUniversalAccumulator
      ).call(
        chainModule,
        id,
        accumulated5,
        { removals: removals3, witnessUpdateInfo: witUpd3 },
        [did2, keyId],
        pair2
      );
      const accum5 = await chainModule.getAccumulator(id, false);
      expect(accum5.accumulated.value).toEqual(accumulated5);

      const updates1 = await chainModule.dockOnly.getUpdatesFromBlock(
        id,
        accum2.lastModified
      );
      expect(updates1[0].newAccumulated.value).toEqual(accumulated2);
      expect(updates1[0].additions).toEqual(null);
      expect(updates1[0].removals).toEqual(null);
      expect(updates1[0].witnessUpdateInfo).toEqual(null);

      const events1 = (
        await getAllEventsFromBlock(dock.api, accum2.lastModified, false)
      ).filter(({ event }) => event.section === "accumulator");

      expect(
        chainModule.dockOnly.constructor.parseEventAsAccumulatorUpdate(
          events1[0].event
        )
      ).toEqual([id.asDock.value, accumulated2]);

      const updates2 = await chainModule.dockOnly.getUpdatesFromBlock(
        id,
        accum3.lastModified
      );
      expect(updates2[0].newAccumulated.value).toEqual(accumulated3);
      expect(updates2[0].additions.eq(ArrayOfByteArrays.from(additions1))).toBe(
        true
      );
      expect(updates2[0].removals.eq(ArrayOfByteArrays.from(removals1))).toBe(
        true
      );
      expect(updates2[0].witnessUpdateInfo.value).toEqual(witUpd1);

      const events2 = (
        await getAllEventsFromBlock(dock.api, accum3.lastModified, false)
      ).filter(({ event }) => event.section === "accumulator");
      expect(
        chainModule.dockOnly.constructor.parseEventAsAccumulatorUpdate(
          events2[0].event
        )
      ).toEqual([id.asDock.value, accumulated3]);

      const updates3 = await chainModule.dockOnly.getUpdatesFromBlock(
        id,
        accum4.lastModified
      );
      expect(updates3[0].newAccumulated.value).toEqual(accumulated4);
      expect(updates3[0].additions.eq(ArrayOfByteArrays.from(additions2))).toBe(
        true
      );
      expect(updates3[0].removals).toEqual(null);
      expect(updates3[0].witnessUpdateInfo.value).toEqual(witUpd2);

      const updates4 = await chainModule.dockOnly.getUpdatesFromBlock(
        id,
        accum5.lastModified
      );
      expect(updates4[0].newAccumulated.value).toEqual(accumulated5);
      expect(updates4[0].additions).toEqual(null);
      expect(updates4[0].removals.eq(ArrayOfByteArrays.from(removals3))).toBe(
        true
      );
      expect(updates4[0].witnessUpdateInfo.value).toEqual(witUpd3);
    }

    await check(0);
    await check(1);
  }

  test("Can add and remove accumulator", async () => {
    await checkAddRemove(1);
  }, 50000);

  test("Update accumulator", async () => {
    await checkUpdate(1);
  }, 50000);

  test("Can add and remove accumulator without public key", async () => {
    await checkAddRemove(0);
  }, 50000);

  test("Update accumulator without public key", async () => {
    await checkUpdate(0);
  }, 50000);

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);
});
