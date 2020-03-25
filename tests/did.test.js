import {Keyring} from '@polkadot/api';
import {randomAsHex, encodeAddress} from '@polkadot/util-crypto';

import {DockSDK} from '../src/dock-sdk';

import {
  validateDockDIDHexIdentifier,
  validateDockDIDSS58Identifier,
  getHexIdentifierFromDID,
  DockDIDQualifier,
  createNewDockDID,
  createKeyDetail, createSignedKeyUpdate, createSignedDidRemoval
} from '../src/utils/did';
import {FullNodeEndpoint, TestKeyringOpts, TestAccount} from './test-constants';
import {generateEcdsaSecp256k1Keypair, getPublicKeyFromKeyringPair} from '../src/utils/misc';
import {PublicKeyEd25519} from '../src/public-key';


describe('DID utilities', () => {
  test('On input as 40 byte hex, validateDockDIDIdentifier throws error', () => {
    expect(() => validateDockDIDHexIdentifier(randomAsHex(40))).toThrow(/DID identifier must be 32 bytes/);
  });

  test('On input as 30 byte hex, validateDockDIDIdentifier throws error', () => {
    expect(() => validateDockDIDHexIdentifier(randomAsHex(30))).toThrow(/DID identifier must be 32 bytes/);
  });

  test('On input as 32 byte hex, validateDockDIDIdentifier does not throw error', () => {
    expect(() => validateDockDIDHexIdentifier(randomAsHex(32))).not.toThrow();
  });

  test('On input as 33 byte hex, getHexIdentifierFromDID throws error', () => {
    const hex = randomAsHex(33);
    expect(() => getHexIdentifierFromDID(hex)).toThrow(/Invalid hex/);
  });

  test('On input as 32 byte hex, getHexIdentifierFromDID returns the input', () => {
    const hex = randomAsHex(32);
    expect(getHexIdentifierFromDID(hex)).toBe(hex);
  });

  test('On input valid SS58 but without qualifier, getHexIdentifierFromDID throws error', () => {
    const hex = randomAsHex(32);
    const id = encodeAddress(hex);
    // Without the qualifier, the function tries to parse as hex
    expect(() => getHexIdentifierFromDID(id)).toThrow(/Invalid hex/);
  });

  test('On input invalid SS58 but with qualifier, getHexIdentifierFromDID throws error', () => {
    const did = `${DockDIDQualifier}oO12`;
    // Without the qualifier, the function tries to parse as hex
    expect(() => getHexIdentifierFromDID(did)).toThrow(/Invalid SS58/);
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
    expect(() => getHexIdentifierFromDID(did)).toThrow(/Invalid SS58/);
  });

  test('On input valid SS58 and with qualifier but larger than 32 bytes, getHexIdentifierFromDID throws error', () => {
    const ss58 = encodeAddress(randomAsHex(32));
    const did = `${DockDIDQualifier}${ss58}${ss58}`;
    // Without the qualifier, the function tries to parse as hex
    expect(() => getHexIdentifierFromDID(did)).toThrow(/Invalid SS58/);
  });

  test('On input valid SS58 identifier but smaller than 32 bytes, validateDockDIDSS58Identifier throws error', () => {
    const ss58 = encodeAddress(randomAsHex(8));
    expect(() => validateDockDIDSS58Identifier(ss58)).toThrow(/The identifier must be 32 bytes and valid SS58 string/);
  });

  test('On input valid SS58 identifier but larger than 32 bytes, validateDockDIDSS58Identifier throws error', () => {
    const ss58 = encodeAddress(randomAsHex(32));
    const did = `${ss58}${ss58}`;
    expect(() => validateDockDIDSS58Identifier(did)).toThrow(/The identifier must be 32 bytes and valid SS58 string/);
  });

  test('On input valid SS58 identifier, validateDockDIDSS58Identifier does not throw error', () => {
    const ss58 = encodeAddress(randomAsHex(32));
    expect(() => validateDockDIDSS58Identifier(ss58)).not.toThrow();
  });
});

describe('DID Module', () => {
  const dock = new DockSDK(FullNodeEndpoint);

  // Generate a random DID
  const dockDID = createNewDockDID();

  // Generate first key with this seed. The key type is Sr25519
  const firstKeySeed = randomAsHex(32);

  // Generate second key (for update) with this seed. The key type is Ed25519
  const secondKeySeed = randomAsHex(32);

  // TODO: Uncomment the `beforeAll` and unskip the tests once a node is deployed.
  /*beforeAll(async (done) => {
    await dock.init();
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
    const pair = dock.keyring.addFromUri(firstKeySeed);
    const publicKey = getPublicKeyFromKeyringPair(pair);

    // The controller is same as the DID
    const keyDetail = createKeyDetail(publicKey, dockDID);

    const transaction = dock.did.new(dockDID, keyDetail);
    const result = await dock.sendTransaction(transaction);
    if (result) {
      const document = await dock.did.getDocument(dockDID);
      expect(!!document).toBe(true);
    }
  }, 30000);

  test.skip('Can get a DID document', async () => {
    const result = await dock.did.getDocument(dockDID);
    console.log('DID Document:', JSON.stringify(result, true, 2));
    expect(!!result).toBe(true);
  }, 10000);

  test.skip('Can update a DID key to ed25519 key', async () => {
    // Sign key update with this key pair as this is the current key of the DID
    const currentPair = dock.keyring.addFromUri(firstKeySeed, null, 'sr25519');

    // Update DID key to the following
    const newPair = dock.keyring.addFromUri(secondKeySeed, null, 'ed25519');
    const newPk = PublicKeyEd25519.fromKeyringPair(newPair);
    const newController = randomAsHex(32);

    const [keyUpdate, signature] = await createSignedKeyUpdate(dock.did, dockDID, newPk, currentPair, newController);

    const transaction = dock.did.updateKey(keyUpdate, signature);
    const result = await dock.sendTransaction(transaction);
    expect(!!result).toBe(true);
  }, 30000);

  test.skip('Can remove a DID', async () => {
    // Sign key update with this key pair as this is the current key of the DID
    const currentPair = dock.keyring.addFromUri(secondKeySeed, null, 'ed25519');

    const [didRemoval, signature] = await createSignedDidRemoval(dock.did, dockDID, currentPair);

    const transaction = dock.did.remove(didRemoval, signature);
    const result = await dock.sendTransaction(transaction);
    if (result) {
      await expect(dock.did.getDocument(dockDID)).rejects.toThrow(/Could not find DID/);
    }
  }, 30000);

  test.skip('Can disconnect from node', async () => {
    await dock.disconnect();
    expect(!!dock.api).toBe(false);
  });
});
