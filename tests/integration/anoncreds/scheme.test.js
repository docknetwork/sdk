import { randomAsHex } from '@polkadot/util-crypto';
import { hexToU8a, u8aToHex, stringToHex } from '@polkadot/util';
import { initializeWasm } from '@docknetwork/crypto-wasm-ts';
import { DockAPI } from '../../../src';
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
  Schemes,
} from '../../test-constants';
import { DockDid, DidKeypair } from '../../../src/did';

import { registerNewDIDUsingPair } from '../helpers';

const addParticipantIdIfNotPresent = (key) => {
  if (!('participantId' in key)) {
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
  const skipIfKvac = Name === 'BDDT16' ? describe.skip : describe;
  skipIfKvac(`${Name} Module`, () => {
    const dock = new DockAPI();
    let account;
    let did1;
    let did2;
    let pair1;
    let pair2;
    let chainModule;
    const chainModuleClass = Module;

    const seed1 = randomAsHex(32);
    const seed2 = randomAsHex(32);

    beforeAll(async () => {
      await dock.init({
        keyring: TestKeyringOpts,
        address: FullNodeEndpoint,
      });
      chainModule = getModule(dock);
      account = dock.keyring.addFromUri(TestAccountURI);
      dock.setAccount(account);
      pair1 = new DidKeypair(dock.keyring.addFromUri(seed1), 1);
      pair2 = new DidKeypair(dock.keyring.addFromUri(seed2), 1);
      did1 = DockDid.random();
      did2 = DockDid.random();
      await registerNewDIDUsingPair(dock, did1, pair1);
      await registerNewDIDUsingPair(dock, did2, pair2);
      await initializeWasm();
    }, 20000);

    test('Can create new params', async () => {
      let label = stringToHex('test-params-label');
      let params = SignatureParams.generate(10, hexToU8a(label));
      const bytes1 = u8aToHex(params.toBytes());
      const params1 = chainModuleClass.prepareAddParameters(
        bytes1,
        undefined,
        label,
      );
      await chainModule.addParams(
        params1,
        did1,
        pair1,
        { didModule: dock.did },
        false,
      );

      const paramsWritten1 = await chainModule.getLastParamsWritten(did1);
      expect(paramsWritten1.bytes).toEqual(params1.bytes);
      expect(paramsWritten1.label).toEqual(params1.label);
      const allParams = await getParamsByDid(dock.api, DockDid.from(did1));
      expect(Object.values(allParams.toJSON())).toEqual([params1]);

      const queriedParams1 = await chainModule.getParams(did1, 1);
      expect(paramsWritten1).toEqual(queriedParams1);

      params = SignatureParams.generate(20);
      const bytes2 = u8aToHex(params.toBytes());
      const params2 = chainModuleClass.prepareAddParameters(bytes2);
      await chainModule.addParams(
        params2,
        did2,
        pair2,
        { didModule: dock.did },
        false,
      );
      const paramsWritten2 = await chainModule.getLastParamsWritten(did2);
      expect(paramsWritten2.bytes).toEqual(params2.bytes);
      expect(paramsWritten2.label).toBe(null);

      const queriedParams2 = await chainModule.getParams(did2, 1);
      expect(paramsWritten2).toEqual(queriedParams2);

      label = stringToHex('test-params-label-2');
      params = SignatureParams.generate(23, hexToU8a(label));
      const bytes3 = u8aToHex(params.toBytes());
      const params3 = chainModuleClass.prepareAddParameters(
        bytes3,
        undefined,
        label,
      );
      await chainModule.addParams(
        params3,
        did1,
        pair1,
        { didModule: dock.did },
        false,
      );
      const paramsWritten3 = await chainModule.getLastParamsWritten(did1);
      expect(paramsWritten3.bytes).toEqual(params3.bytes);
      expect(paramsWritten3.label).toBe(params3.label);

      const queriedParams3 = await chainModule.getParams(did1, 2);
      expect(paramsWritten3).toEqual(queriedParams3);

      const paramsByDid1 = await chainModule.getAllParamsByDid(did1);
      expect(paramsByDid1[0]).toEqual(paramsWritten1);
      expect(paramsByDid1[1]).toEqual(paramsWritten3);

      const paramsByDid2 = await chainModule.getAllParamsByDid(did2);
      expect(paramsByDid2[0]).toEqual(paramsWritten2);
    }, 30000);

    test('Can create public keys', async () => {
      const params = SignatureParams.generate(5);
      let keypair = KeyPair.generate(params);
      const bytes1 = u8aToHex(keypair.publicKey.bytes);
      const pk1 = chainModuleClass.prepareAddPublicKey(bytes1);
      await chainModule.addPublicKey(
        pk1,
        did1,
        did1,
        pair1,
        { didModule: dock.did },
        false,
      );
      const queriedPk1 = await chainModule.getPublicKey(did1, 2);
      expect(queriedPk1.bytes).toEqual(pk1.bytes);
      expect(queriedPk1.paramsRef).toBe(null);

      const queriedParams1 = await chainModule.getParams(did1, 1);
      const params1Val = SignatureParams.valueFromBytes(
        hexToU8a(queriedParams1.bytes),
      );
      const params1 = new SignatureParams(
        params1Val,
        hexToU8a(queriedParams1.label),
      );
      keypair = KeyPair.generate(params1);
      const bytes2 = u8aToHex(keypair.publicKey.bytes);
      const pk2 = chainModuleClass.prepareAddPublicKey(bytes2, undefined, [
        did1,
        1,
      ]);
      await chainModule.addPublicKey(
        pk2,
        did2,
        did2,
        pair2,
        { didModule: dock.did },
        false,
      );
      const queriedPk2 = await chainModule.getPublicKey(did2, 2);
      expect(queriedPk2.bytes).toEqual(pk2.bytes);
      expect(queriedPk2.paramsRef).toEqual([DockDid.from(did1), 1]);
      const keyWithParams = await getPublicKeyWithParamsByStorageKey(dock.api, [
        DockDid.from(did2).asDid,
        2,
      ]);
      const jsonKeyWithParams = keyWithParams.toJSON();
      addParticipantIdIfNotPresent(jsonKeyWithParams[0]);
      expect(jsonKeyWithParams).toEqual([queriedPk2, queriedParams1]);

      const queriedPk2WithParams = await chainModule.getPublicKey(
        did2,
        2,
        true,
      );
      expect(queriedPk2WithParams.params).toEqual(queriedParams1);

      const queriedParams2 = await chainModule.getParams(did1, 2);
      const params2Val = SignatureParams.valueFromBytes(
        hexToU8a(queriedParams2.bytes),
      );
      const params2 = new SignatureParams(
        params2Val,
        hexToU8a(queriedParams2.label),
      );
      keypair = KeyPair.generate(params2);
      const bytes3 = u8aToHex(keypair.publicKey.bytes);
      const pk3 = chainModuleClass.prepareAddPublicKey(bytes3, undefined, [
        did1,
        2,
      ]);
      await chainModule.addPublicKey(
        pk3,
        did2,
        did2,
        pair2,
        { didModule: dock.did },
        false,
      );

      const queriedPk3 = await chainModule.getPublicKey(did2, 3);
      expect(queriedPk3.bytes).toEqual(pk3.bytes);
      expect(queriedPk3.paramsRef).toEqual([DockDid.from(did1), 2]);

      const queriedPk3WithParams = await chainModule.getPublicKey(
        did2,
        3,
        true,
      );
      expect(queriedPk3WithParams.params).toEqual(queriedParams2);
      const allPks = await getPublicKeysByDid(dock.api, DockDid.from(did2));
      expect(
        Object.values(allPks.toJSON()).map((keyWithParams) => {
          addParticipantIdIfNotPresent(keyWithParams[0]);
          return keyWithParams;
        }),
      ).toEqual([
        [queriedPk2, queriedParams1],
        [queriedPk3, queriedParams2],
      ]);
    }, 30000);

    test('Get public keys with DID resolution', async () => {
      const document1 = await dock.did.getDocument(did1, {
        getOffchainSigKeys: true,
      });
      expect(document1.publicKey.length).toEqual(2);
      expect(document1.assertionMethod.length).toEqual(2);
      expect(document1.publicKey[1].id.endsWith('#keys-2')).toEqual(true);
      expect(document1.publicKey[1].type).toEqual(VerKey);
      expect(document1.assertionMethod[1].endsWith('#keys-2')).toEqual(true);

      const document2 = await dock.did.getDocument(did2, {
        getOffchainSigKeys: true,
      });
      expect(document2.publicKey.length).toEqual(3);
      expect(document2.assertionMethod.length).toEqual(3);
      expect(document2.publicKey[1].id.endsWith('#keys-2')).toEqual(true);
      expect(document2.publicKey[1].type).toEqual(VerKey);
      expect(document2.publicKey[2].id.endsWith('#keys-3')).toEqual(true);
      expect(document2.publicKey[2].type).toEqual(VerKey);
      expect(document2.assertionMethod[1].endsWith('#keys-2')).toEqual(true);
      expect(document2.assertionMethod[2].endsWith('#keys-3')).toEqual(true);
    });

    test('Can remove public keys and params', async () => {
      await chainModule.removePublicKey(
        2,
        did1,
        did1,
        pair1,
        { didModule: dock.did },
        false,
      );
      const pk1 = await chainModule.getPublicKey(did1, 2);
      expect(pk1).toEqual(null);

      const document1 = await dock.did.getDocument(did1, {
        getOffchainSigKeys: true,
      });
      expect(document1.publicKey.length).toEqual(1);
      expect(document1.assertionMethod.length).toEqual(1);
      expect(document1.publicKey[0].id.endsWith('#keys-1')).toEqual(true);
      expect(document1.publicKey[0].type).not.toEqual(VerKey);
      expect(document1.assertionMethod[0].endsWith('#keys-1')).toEqual(true);

      await chainModule.removeParams(
        1,
        did1,
        pair1,
        { didModule: dock.did },
        false,
      );
      const params1 = await chainModule.getParams(did1, 1);
      expect(params1).toEqual(null);

      await expect(chainModule.getPublicKey(did2, 2, true)).rejects.toThrow();

      await chainModule.removePublicKey(
        2,
        did2,
        did2,
        pair2,
        { didModule: dock.did },
        false,
      );
      const pk2 = await chainModule.getPublicKey(did2, 2);
      expect(pk2).toEqual(null);

      let document2 = await dock.did.getDocument(did2, {
        getOffchainSigKeys: true,
      });
      expect(document2.publicKey.length).toEqual(2);
      expect(document2.assertionMethod.length).toEqual(2);
      expect(document2.publicKey[0].id.endsWith('#keys-1')).toEqual(true);
      expect(document2.publicKey[0].type).not.toEqual(VerKey);
      expect(document2.assertionMethod[0].endsWith('#keys-1')).toEqual(true);
      expect(document2.publicKey[1].id.endsWith('#keys-3')).toEqual(true);
      expect(document2.publicKey[1].type).toEqual(VerKey);
      expect(document2.assertionMethod[1].endsWith('#keys-3')).toEqual(true);

      await chainModule.removePublicKey(
        3,
        did2,
        did2,
        pair2,
        { didModule: dock.did },
        false,
      );
      const pk3 = await chainModule.getPublicKey(did2, 3);
      expect(pk3).toEqual(null);

      document2 = await dock.did.getDocument(did2, {
        getOffchainSigKeys: true,
      });
      expect(document2.publicKey.length).toEqual(1);
      expect(document2.assertionMethod.length).toEqual(1);
      expect(document2.publicKey[0].id.endsWith('#keys-1')).toEqual(true);
      expect(document2.publicKey[0].type).not.toEqual(VerKey);
      expect(document2.assertionMethod[0].endsWith('#keys-1')).toEqual(true);

      await chainModule.removeParams(
        2,
        did1,
        pair1,
        { didModule: dock.did },
        false,
      );
      const params2 = await chainModule.getParams(did1, 2);
      expect(params2).toEqual(null);

      await chainModule.removeParams(
        1,
        did2,
        pair2,
        { didModule: dock.did },
        false,
      );
      const params3 = await chainModule.getParams(did2, 1);
      expect(params3).toEqual(null);
    }, 50000);

    afterAll(async () => {
      await dock.disconnect();
    }, 10000);
  });
}
