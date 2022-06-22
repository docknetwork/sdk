import { randomAsHex } from '@polkadot/util-crypto';
import { hexToU8a, u8aToHex, stringToHex } from '@polkadot/util';
import { initializeWasm } from '@docknetwork/crypto-wasm';
import { KeypairG2, SignatureParamsG1 } from '@docknetwork/crypto-wasm-ts';
import { DockAPI } from '../../../src';
import { FullNodeEndpoint, TestAccountURI, TestKeyringOpts } from '../../test-constants';
import { getPublicKeyFromKeyringPair } from '../../../src/utils/misc';
import { createKeyDetail, createNewDockDID, getHexIdentifierFromDID } from '../../../src/utils/did';

import BBSPlusModule from '../../../src/modules/bbs-plus';

describe('BBS+ Module', () => {
  const dock = new DockAPI();
  let account;
  let did1;
  let did2;
  let pair1;
  let pair2;
  let chainModule;
  const chainModuleClass = BBSPlusModule;

  const seed1 = randomAsHex(32);
  const seed2 = randomAsHex(32);

  beforeAll(async (done) => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    chainModule = dock.bbsPlusModule;
    account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
    pair1 = dock.keyring.addFromUri(seed1);
    pair2 = dock.keyring.addFromUri(seed2);
    did1 = createNewDockDID();
    did2 = createNewDockDID();
    await dock.did.new(did1, createKeyDetail(getPublicKeyFromKeyringPair(pair1), did1), false);
    await dock.did.new(did2, createKeyDetail(getPublicKeyFromKeyringPair(pair2), did2), false);
    await initializeWasm();
    done();
  }, 20000);

  test('Can create new params', async () => {
    let label = stringToHex('test-params-label');
    let params = SignatureParamsG1.generate(10, hexToU8a(label));
    const bytes1 = u8aToHex(params.toBytes());
    const params1 = chainModuleClass.prepareAddParameters(bytes1, undefined, label);
    await chainModule.createNewParams(params1, getHexIdentifierFromDID(did1), pair1, undefined, false);
    const paramsWritten1 = await chainModule.getLastParamsWritten(did1);
    expect(paramsWritten1.bytes).toEqual(params1.bytes);
    expect(paramsWritten1.label).toEqual(params1.label);

    const queriedParams1 = await chainModule.getParams(did1, 1);
    expect(paramsWritten1).toEqual(queriedParams1);

    params = SignatureParamsG1.generate(20);
    const bytes2 = u8aToHex(params.toBytes());
    const params2 = chainModuleClass.prepareAddParameters(bytes2);
    await chainModule.createNewParams(params2, getHexIdentifierFromDID(did2), pair2, undefined, false);
    const paramsWritten2 = await chainModule.getLastParamsWritten(did2);
    expect(paramsWritten2.bytes).toEqual(params2.bytes);
    expect(paramsWritten2.label).toBe(null);

    const queriedParams2 = await chainModule.getParams(did2, 1);
    expect(paramsWritten2).toEqual(queriedParams2);

    label = stringToHex('test-params-label-2');
    params = SignatureParamsG1.generate(23, hexToU8a(label));
    const bytes3 = u8aToHex(params.toBytes());
    const params3 = chainModuleClass.prepareAddParameters(bytes3, undefined, label);
    await chainModule.createNewParams(params3, getHexIdentifierFromDID(did1), pair1, undefined, false);
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
    const params = SignatureParamsG1.generate(5);
    let keypair = KeypairG2.generate(params);
    const bytes1 = u8aToHex(keypair.public_key);
    const pk1 = chainModuleClass.prepareAddPublicKey(bytes1);
    await chainModule.createNewPublicKey(pk1, getHexIdentifierFromDID(did1), pair1, undefined, false);
    const pkWritten1 = await chainModule.getLastPublicKeyWritten(did1);
    expect(pkWritten1.bytes).toEqual(pk1.bytes);
    expect(pkWritten1.paramsRef).toBe(null);

    const queriedPk1 = await chainModule.getPublicKey(did1, 1);
    expect(pkWritten1).toEqual(queriedPk1);

    const queriedParams1 = await chainModule.getParams(did1, 1);
    const params1Val = SignatureParamsG1.valueFromBytes(hexToU8a(queriedParams1.bytes));
    const params1 = new SignatureParamsG1(params1Val, hexToU8a(queriedParams1.label));
    keypair = KeypairG2.generate(params1);
    const bytes2 = u8aToHex(keypair.public_key);
    const pk2 = chainModuleClass.prepareAddPublicKey(bytes2, undefined, [did1, 1]);
    await chainModule.createNewPublicKey(pk2, getHexIdentifierFromDID(did2), pair2, undefined, false);
    const pkWritten2 = await chainModule.getLastPublicKeyWritten(did2);
    expect(pkWritten2.bytes).toEqual(pk2.bytes);
    expect(pkWritten2.paramsRef).toEqual([getHexIdentifierFromDID(did1), 1]);

    const queriedPk2 = await chainModule.getPublicKey(did2, 1);
    expect(pkWritten2).toEqual(queriedPk2);

    const queriedPk2WithParams = await chainModule.getPublicKey(did2, 1, true);
    expect(queriedPk2WithParams.params).toEqual(queriedParams1);

    const queriedParams2 = await chainModule.getParams(did1, 2);
    const params2Val = SignatureParamsG1.valueFromBytes(hexToU8a(queriedParams2.bytes));
    const params2 = new SignatureParamsG1(params2Val, hexToU8a(queriedParams2.label));
    keypair = KeypairG2.generate(params2);
    const bytes3 = u8aToHex(keypair.public_key);
    const pk3 = chainModuleClass.prepareAddPublicKey(bytes3, undefined, [did1, 2]);
    await chainModule.createNewPublicKey(pk3, getHexIdentifierFromDID(did2), pair2, undefined, false);
    const pkWritten3 = await chainModule.getLastPublicKeyWritten(did2);
    expect(pkWritten3.bytes).toEqual(pk3.bytes);
    expect(pkWritten3.paramsRef).toEqual([getHexIdentifierFromDID(did1), 2]);

    const queriedPk3 = await chainModule.getPublicKey(did2, 2);
    expect(pkWritten3).toEqual(queriedPk3);

    const queriedPk3WithParams = await chainModule.getPublicKey(did2, 2, true);
    expect(queriedPk3WithParams.params).toEqual(queriedParams2);

    const pksByDid1 = await chainModule.getAllPublicKeysByDid(did1);
    expect(pksByDid1[0]).toEqual(pkWritten1);

    const pksByDid2 = await chainModule.getAllPublicKeysByDid(did2);
    expect(pksByDid2[0]).toEqual(pkWritten2);
    expect(pksByDid2[1]).toEqual(pkWritten3);

    const pksWithParamsByDid2 = await chainModule.getAllPublicKeysByDid(did2, true);
    expect(pksWithParamsByDid2[0]).toEqual(queriedPk2WithParams);
    expect(pksWithParamsByDid2[1]).toEqual(queriedPk3WithParams);
  }, 30000);

  test('Can remove public keys and params', async () => {
    await chainModule.removePublicKey(did1, 1, pair1, undefined, false);
    const pk1 = await chainModule.getPublicKey(did1, 1);
    expect(pk1).toEqual(null);

    const pksByDid1 = await chainModule.getAllPublicKeysByDid(did1);
    expect(pksByDid1.length).toEqual(0);

    await chainModule.removeParams(did1, 1, pair1, undefined, false);
    const params1 = await chainModule.getParams(did1, 1);
    expect(params1).toEqual(null);

    await expect(chainModule.getPublicKey(did2, 1, true)).rejects.toThrow();

    await chainModule.removePublicKey(did2, 1, pair2, undefined, false);
    const pk2 = await chainModule.getPublicKey(did2, 1);
    expect(pk2).toEqual(null);

    const pksByDid2 = await chainModule.getAllPublicKeysByDid(did2);
    expect(pksByDid2.length).toEqual(1);

    const queriedPk2 = await chainModule.getPublicKey(did2, 2);
    expect(pksByDid2[0]).toEqual(queriedPk2);

    await chainModule.removePublicKey(did2, 2, pair2, undefined, false);
    const pk3 = await chainModule.getPublicKey(did2, 2);
    expect(pk3).toEqual(null);

    await chainModule.removeParams(did1, 2, pair1, undefined, false);
    const params2 = await chainModule.getParams(did1, 2);
    expect(params2).toEqual(null);

    await chainModule.removeParams(did2, 1, pair2, undefined, false);
    const params3 = await chainModule.getParams(did2, 1);
    expect(params3).toEqual(null);
  }, 50000);

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);
});
