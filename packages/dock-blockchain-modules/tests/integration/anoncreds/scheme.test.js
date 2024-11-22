import {
  randomAsHex,
  hexToU8a,
  u8aToHex,
  stringToHex,
} from "@docknetwork/credential-sdk/utils";
import { initializeWasm } from "@docknetwork/credential-sdk/crypto";
import { DockAPI } from "@docknetwork/dock-blockchain-api";
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
  Schemes,
} from "../../test-constants";
import {
  DockDid,
  OffchainSignaturePublicKeyValueWithParamsValue,
} from "@docknetwork/credential-sdk/types";
import {
  Ed25519Keypair,
  DidKeypair,
} from "@docknetwork/credential-sdk/keypairs";

import { registerNewDIDUsingPair } from "../helpers";
import { DockCoreModules } from "../../../src";
import { MultiApiCoreModules } from "@docknetwork/credential-sdk/modules";

const addParticipantIdIfNotPresent = (key) => {
  if (!("participantId" in key)) {
    key.participantId = null;
  }
  return key;
};

for (const {
  Name,
  Module,
  getModule,
  KeyPair,
  SignatureParams,
  VerKey,
  getParamsByDid,
  getPublicKeyWithParamsByStorageKey,
  getPublicKeysByDid,
} of Schemes) {
  const skipIfKvac = Name === "BBDT16" ? describe.skip : describe;

  skipIfKvac(`${Name} Module`, () => {
    const dock = new DockAPI();
    const modules = new MultiApiCoreModules([new DockCoreModules(dock)]);
    let account;
    let chainModule;
    const chainModuleClass = Module;

    const seed1 = randomAsHex(32);
    const seed2 = randomAsHex(32);

    const did1 = DockDid.random();
    const did2 = DockDid.random();

    const pair1 = new DidKeypair([did1, 1], new Ed25519Keypair(seed1));
    const pair2 = new DidKeypair([did2, 1], new Ed25519Keypair(seed2));

    beforeAll(async () => {
      await dock.init({
        keyring: TestKeyringOpts,
        address: FullNodeEndpoint,
      });
      chainModule = getModule(dock);
      account = dock.keyring.addFromUri(TestAccountURI);
      dock.setAccount(account);

      await registerNewDIDUsingPair(dock, did1, pair1);
      await registerNewDIDUsingPair(dock, did2, pair2);
      await initializeWasm();
    }, 20000);

    test("Can create new params", async () => {
      let label = stringToHex("test-params-label");
      let params = SignatureParams.generate(10, hexToU8a(label));
      const bytes1 = u8aToHex(params.toBytes());
      const params1 = chainModuleClass.prepareAddParameters(bytes1, label);
      await chainModule.addParams(await chainModule.nextParamsId(did1), params1, did1, pair1);
      const paramsWritten1 = await chainModule.getParams(
        did1,
        await chainModule.lastParamsId(did1)
      );
      expect(paramsWritten1.bytes).toEqual(params1.bytes);
      expect(paramsWritten1.label).toEqual(params1.label);
      const allParams = await getParamsByDid(dock.api, did1);

      expect(Object.values(allParams.toJSON())).toEqual([
        params1.value.toJSON(),
      ]);

      const queriedParams1 = await chainModule.getParams(did1, 1);
      expect(paramsWritten1.eq(queriedParams1)).toBe(true);

      params = SignatureParams.generate(20);
      const bytes2 = u8aToHex(params.toBytes());
      const params2 = chainModuleClass.prepareAddParameters(bytes2);
      await chainModule.addParams(await chainModule.nextParamsId(did2), params2, did2, pair2);
      const paramsWritten2 = await chainModule.getParams(
        did2,
        await chainModule.lastParamsId(did2)
      );
      expect(paramsWritten2.bytes).toEqual(params2.bytes);
      expect(paramsWritten2.label).toBe(null);

      const queriedParams2 = await chainModule.getParams(did2, 1);
      expect(paramsWritten2.eq(queriedParams2)).toBe(true);

      label = stringToHex("test-params-label-2");
      params = SignatureParams.generate(23, hexToU8a(label));
      const bytes3 = u8aToHex(params.toBytes());
      const params3 = chainModuleClass.prepareAddParameters(bytes3, label);
      await chainModule.addParams(await chainModule.nextParamsId(did1), params3, did1, pair1);
      const paramsWritten3 = await chainModule.getParams(
        did1,
        await chainModule.lastParamsId(did1)
      );
      expect(paramsWritten3.bytes).toEqual(params3.bytes);
      expect(paramsWritten3.label).toEqual(params3.label);

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
      const params = SignatureParams.generate(5);
      let keypair = KeyPair.generate(params);
      const bytes1 = u8aToHex(keypair.publicKey.bytes);
      const pk1 = new chainModuleClass.DockOnly.PublicKey(
        new chainModuleClass.DockOnly.PublicKey.Class(bytes1)
      );
      await chainModule.dockOnly.send.addPublicKey(pk1, did1, pair1);
      const queriedPk1 = await chainModule.dockOnly.getPublicKey(did1, 2);
      expect(queriedPk1.bytes).toEqual(pk1.bytes);
      expect(queriedPk1.paramsRef).toBe(null);

      const queriedParams1 = await chainModule.getParams(did1, 1);
      const params1Val = SignatureParams.valueFromBytes(
        queriedParams1.bytes.bytes
      );
      const params1 = new SignatureParams(
        params1Val,
        queriedParams1.label.bytes
      );
      keypair = KeyPair.generate(params1);
      const bytes2 = u8aToHex(keypair.publicKey.bytes);
      const pk2 = new chainModuleClass.DockOnly.PublicKey(
        new chainModuleClass.DockOnly.PublicKey.Class(bytes2, [did1, 1])
      );
      await chainModule.dockOnly.send.addPublicKey(pk2, did2, pair2);
      const queriedPk2 = await chainModule.dockOnly.getPublicKey(did2, 2);
      expect(queriedPk2.bytes).toEqual(pk2.bytes);

      expect(queriedPk2.paramsRef.eq([did1, 1])).toBe(true);
      const keyWithParams = await getPublicKeyWithParamsByStorageKey(dock.api, [
        DockDid.from(did2).asDid,
        2,
      ]);
      const jsonKeyWithParams = keyWithParams.toJSON();
      addParticipantIdIfNotPresent(jsonKeyWithParams[0]);
      expect(jsonKeyWithParams).toEqual(
        new OffchainSignaturePublicKeyValueWithParamsValue(
          queriedPk2.value,
          queriedParams1.value
        ).toJSON()
      );

      const queriedPk2WithParams = await chainModule.dockOnly.getPublicKey(
        did2,
        2,
        true
      );
      expect(queriedPk2WithParams.params.eq(queriedParams1)).toBe(true);

      const queriedParams2 = await chainModule.getParams(did1, 2);
      const params2Val = SignatureParams.valueFromBytes(
        queriedParams2.bytes.bytes
      );
      const params2 = new SignatureParams(
        params2Val,
        queriedParams2.label.bytes
      );
      keypair = KeyPair.generate(params2);
      const bytes3 = u8aToHex(keypair.publicKey.bytes);
      const pk3 = new chainModuleClass.DockOnly.PublicKey(
        new chainModuleClass.DockOnly.PublicKey.Class(bytes3, [did1, 2])
      );
      await chainModule.dockOnly.send.addPublicKey(pk3, did2, pair2);

      const queriedPk3 = await chainModule.dockOnly.getPublicKey(did2, 3);
      expect(queriedPk3.bytes).toEqual(pk3.bytes);
      expect(queriedPk3.paramsRef.eq([did1, 2])).toBe(true);

      const queriedPk3WithParams = await chainModule.dockOnly.getPublicKey(
        did2,
        3,
        true
      );
      expect(queriedPk3WithParams.params.eq(queriedParams2)).toBe(true);
      const allPks = await getPublicKeysByDid(dock.api, DockDid.from(did2));
      expect(
        Object.values(allPks.toJSON()).map((keyWithParams) => {
          addParticipantIdIfNotPresent(keyWithParams[0]);
          return keyWithParams;
        })
      ).toEqual([
        new OffchainSignaturePublicKeyValueWithParamsValue(
          queriedPk2.value,
          queriedParams1.value
        ).toJSON(),
        new OffchainSignaturePublicKeyValueWithParamsValue(
          queriedPk3.value,
          queriedParams2.value
        ).toJSON(),
      ]);
    }, 30000);

    test("Get public keys with DID resolution", async () => {
      const document1 = (await modules.did.getDocument(did1)).toJSON();
      expect(document1.verificationMethod.length).toEqual(2);
      expect(document1.assertionMethod.length).toEqual(2);
      expect(document1.verificationMethod[1].id.endsWith("#keys-2")).toEqual(
        true
      );
      expect(document1.verificationMethod[1].type).toEqual(VerKey);
      expect(document1.assertionMethod[1].endsWith("#keys-2")).toEqual(true);

      const document2 = (await modules.did.getDocument(did2)).toJSON();
      expect(document2.verificationMethod.length).toEqual(3);
      expect(document2.assertionMethod.length).toEqual(3);
      expect(document2.verificationMethod[1].id.endsWith("#keys-2")).toEqual(
        true
      );
      expect(document2.verificationMethod[1].type).toEqual(VerKey);
      expect(document2.verificationMethod[2].id.endsWith("#keys-3")).toEqual(
        true
      );
      expect(document2.verificationMethod[2].type).toEqual(VerKey);
      expect(document2.assertionMethod[1].endsWith("#keys-2")).toEqual(true);
      expect(document2.assertionMethod[2].endsWith("#keys-3")).toEqual(true);
    });

    afterAll(async () => {
      await dock.disconnect();
    }, 10000);
  });
}
