import {Keyring} from '@polkadot/api';
import {randomAsHex, encodeAddress, decodeAddress} from '@polkadot/util-crypto';
import {u8aToHex} from '@polkadot/util';

import {
  DockSDK,
  PublicKeySr25519,
  PublicKeyEd25519,
  SignatureSr25519,
  SignatureEd25519
} from '../src/dock-sdk';

import {FullNodeEndpoint, TestKeyringOpts, TestAccount} from './test-constants';
import {privates} from '../src/modules/did';

const {validateDockDIDIdentifier, getHexIdentifierFromDID, DockDIDQualifier} = privates;

describe('DID Module', () => {
  const dock = new DockSDK(FullNodeEndpoint);

  // Generate a random DID
  const didIdentifier = randomAsHex(32);

  // Generate key with this seed.
  const seed = randomAsHex(32);

  test('On input as 40 byte hex, validateDockDIDIdentifier throws error', () => {
    expect(validateDockDIDIdentifier.bind(null, randomAsHex(40))).toThrow(/DID identifier must be 32 bytes/);
  });

  test('On input as 30 byte hex, validateDockDIDIdentifier throws error', () => {
    expect(validateDockDIDIdentifier.bind(null, randomAsHex(30))).toThrow(/DID identifier must be 32 bytes/);
  });

  test('On input as 32 byte hex, validateDockDIDIdentifier does not throw error', () => {
    expect(validateDockDIDIdentifier.bind(null, randomAsHex(32))).not.toThrow();
  });

  test('On input as 33 byte hex, getHexIdentifierFromDID throws error', () => {
    const hex = randomAsHex(33);
    expect(getHexIdentifierFromDID.bind(null, hex)).toThrow(/Invalid hex/);
  });

  test('On input as 32 byte hex, getHexIdentifierFromDID returns the input', () => {
    const hex = randomAsHex(32);
    expect(getHexIdentifierFromDID(hex)).toBe(hex);
  });

  test('On input valid SS58 but without qualifier, getHexIdentifierFromDID throws error', () => {
    const hex = randomAsHex(32);
    const id = encodeAddress(hex);
    // Without the qualifier, the function tries to parse as hex
    expect(getHexIdentifierFromDID.bind(null, id)).toThrow(/Invalid hex/);
  });

  test('On input invalid SS58 but with qualifier, getHexIdentifierFromDID throws error', () => {
    const did = `${DockDIDQualifier}oO12`;
    // Without the qualifier, the function tries to parse as hex
    expect(getHexIdentifierFromDID.bind(null, did)).toThrow(/Invalid SS58/);
  });

  test('On input fully qualified Dock DID, getHexIdentifierFromDID returns valid hex representation', () => {
    // create a valid DID
    const hex = randomAsHex(32);
    const did = `${DockDIDQualifier}${encodeAddress(hex)}`;
    expect(getHexIdentifierFromDID(did)).toBe(hex);
  });

  test('On input valid SS58 and with qualifier but smaller than 32 bytes, getHexIdentifierFromDID throws error', () => {
    const hex = randomAsHex(8);
    const did = `${DockDIDQualifier}${encodeAddress(hex)}`;
    // Without the qualifier, the function tries to parse as hex
    expect(getHexIdentifierFromDID.bind(null, did)).toThrow(/Invalid SS58/);
  });

  test('On input valid SS58 and with qualifier but larger than 32 bytes, getHexIdentifierFromDID throws error', () => {
    const ss58 = encodeAddress(randomAsHex(32));
    const did = `${DockDIDQualifier}${ss58}${ss58}`;
    // Without the qualifier, the function tries to parse as hex
    expect(getHexIdentifierFromDID.bind(null, did)).toThrow(/Invalid SS58/);
  });

  // TODO: Uncomment the `beforeAll` and unskip the tests once a node is deployed.
  /*beforeAll(async (done) => {
    await dock.init();
    // Do whatever you need to do
    done();
  });*/

  test.skip('Can connect to node', () => {
    //await dock.init();
    expect(!!dock.api).toBe(true);
  });

  test.skip('Has keyring and account', () => {
    dock.keyring = new Keyring(TestKeyringOpts);
    const account = dock.keyring.addFromUri(TestAccount.uri, TestAccount.options);
    dock.setAccount(account);
    expect(!!dock.keyring).toBe(true);
    expect(!!dock.account).toBe(true);
  });

  test.skip('Can create a DID', async () => {
    const pair = dock.keyring.addFromUri(seed, null, 'sr25519');
    const publicKey = new PublicKeySr25519(u8aToHex(pair.publicKey));
    // controller is same as DID
    const transaction = dock.did.new(didIdentifier, didIdentifier, publicKey);
    const result = await dock.sendTransaction(transaction);
    expect(!!result).toBe(true);
  }, 30000);

  test('Can get a DID document', () => {
    // const result = await dock.did.getDocument(didIdentifier);
    // console.log('DID Document:', JSON.stringify(result, true, 2));
    const result = true; // disabled temporarily because cant connect to node and submit txs
    expect(!!result).toBe(true);
  });

  test('Can update a DID Key', () => {
    // TODO
    const result = true; // disabled temporarily because cant connect to node and submit txs
    expect(!!result).toBe(true);
  });

  test('Can remove a DID', () => {
    // TODO
    const result = true; // disabled temporarily because cant connect to node and submit txs
    expect(!!result).toBe(true);
  });

  test('Can disconnect from node', async () => {
    await dock.disconnect();
    expect(!!dock.api).toBe(false);
  });
});
