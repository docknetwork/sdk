import { randomAsHex } from '@polkadot/util-crypto';
import { hexToU8a, u8aToHex, stringToHex } from '@polkadot/util';
import { initializeWasm, KeypairG2, SignatureParamsG1 } from '@docknetwork/crypto-wasm-ts';
import { DockAPI } from '../../../src';
import { FullNodeEndpoint, TestAccountURI, TestKeyringOpts } from '../../test-constants';
import { createNewDockDID, getHexIdentifierFromDID } from '../../../src/utils/did';

import BBSPlusModule from '../../../src/modules/bbs-plus';
import { registerNewDIDUsingPair } from '../helpers';

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

  beforeAll(async () => {
    await initializeWasm();
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
    await registerNewDIDUsingPair(dock, did1, pair1);
    await registerNewDIDUsingPair(dock, did2, pair2);
  }, 20000);

  test('Can create BBS+ public key for the DID', async () => {
    const params = SignatureParamsG1.generate(5);
    let keypair = KeypairG2.generate(params);
    const bytes1 = u8aToHex(keypair.publicKey.bytes);
    const pk1 = chainModuleClass.prepareAddPublicKey(bytes1);
    await chainModule.addPublicKey(pk1, did1, did1, pair1, 1, { didModule: dock.did }, false);
    const queriedPk1 = await chainModule.getPublicKey(did1, 2);
    expect(queriedPk1.bytes).toEqual(pk1.bytes);
    expect(queriedPk1.paramsRef).toBe(null);

    const didDocument = await dock.did.getDocument(did1);
    console.log('didDocument', didDocument)
  }, 30000);

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);
});
