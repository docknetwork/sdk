import {Keyring} from '@polkadot/api';
import {randomAsHex, encodeAddress} from '@polkadot/util-crypto';
import {u8aToHex} from '@polkadot/util';

import {
  DockSDK,
  PublicKeySr25519,
  PublicKeyEd25519,
  SignatureSr25519,
  SignatureEd25519
} from '../src/dock-sdk';
import {validateDockDIDIdentifier, getHexIdentifierFromDID, DockDIDQualifier} from '../src/modules/did';
import {FullNodeEndpoint, TestKeyringOpts, TestAccount} from './test-constants';


describe('DID utilities', () => {
  test('On input as 40 byte hex, validateDockDIDIdentifier throws error', () => {
    expect(() => validateDockDIDIdentifier(randomAsHex(40))).toThrow(/DID identifier must be 32 bytes/);
  });

  test('On input as 30 byte hex, validateDockDIDIdentifier throws error', () => {
    expect(() => validateDockDIDIdentifier(randomAsHex(30))).toThrow(/DID identifier must be 32 bytes/);
  });

  test('On input as 32 byte hex, validateDockDIDIdentifier does not throw error', () => {
    expect(() => validateDockDIDIdentifier(randomAsHex(32))).not.toThrow();
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
});

describe('DID Module', () => {
  const dock = new DockSDK(FullNodeEndpoint);

  // Generate a random DID
  const didIdentifier = randomAsHex(32);

  // Generate first key with this seed. The key type is Sr25519
  const firstKeySeed = randomAsHex(32);

  // Generate second key (for update) with this seed. The key type is Ed25519
  const secondKeySeed = randomAsHex(32);

  // TODO: Uncomment the `beforeAll` and unskip the tests once a node is deployed.
  // beforeAll(async (done) => {
  //   await dock.init();
  //   done();
  // });

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
    const pair = dock.keyring.addFromUri(firstKeySeed, null, 'sr25519');
    const publicKey = new PublicKeySr25519(u8aToHex(pair.publicKey));
    // controller is same as DID
    const transaction = dock.did.new(didIdentifier, didIdentifier, publicKey);
    const result = await dock.sendTransaction(transaction);
    if (result) {
      const document = await dock.did.getDocument(didIdentifier);
      expect(!!document).toBe(true);
    }
  }, 30000);

  test.skip('Can get a DID document', async () => {
    const result = await dock.did.getDocument(didIdentifier);
    console.log('DID Document:', JSON.stringify(result, true, 2));
    expect(!!result).toBe(true);
  }, 10000);

  test.skip('Can update a DID key', async () => {
    // Get DID details. This call will fail if DID is not written already
    const last_modified_in_block = (await dock.did.getDetail(didIdentifier))[1];
    // Sign key update with this key pair as this is the current key of the DID
    const currentPair = dock.keyring.addFromUri(firstKeySeed, null, 'sr25519');

    // Update DID key to the following
    const newPair = dock.keyring.addFromUri(secondKeySeed, null, 'ed25519');
    const newPk = PublicKeyEd25519.fromKeyringPair(newPair);
    const newController = randomAsHex(32);

    const serializedKeyUpdate = dock.did.getSerializedKeyUpdate(didIdentifier, newPk, last_modified_in_block, newController);
    const signature = new SignatureSr25519(serializedKeyUpdate, currentPair);

    const transaction = dock.did.updateKey(didIdentifier, signature, newPk, last_modified_in_block, newController);
    const result = await dock.sendTransaction(transaction);
    expect(!!result).toBe(true);
  }, 30000);

  test.skip('Can remove a DID', async () => {
    // Get DID details. This call will fail if DID is not written already
    const last_modified_in_block = (await dock.did.getDetail(didIdentifier))[1];

    // Sign key update with this key pair as this is the current key of the DID
    const currentPair = dock.keyring.addFromUri(secondKeySeed, null, 'ed25519');

    const serializedDIDRemoval = dock.did.getSerializedDIDRemoval(didIdentifier, last_modified_in_block);
    const signature = new SignatureEd25519(serializedDIDRemoval, currentPair);

    const transaction = dock.did.remove(didIdentifier, signature, last_modified_in_block);
    const result = await dock.sendTransaction(transaction);
    if (result) {
      await expect(dock.did.getDocument(didIdentifier)).rejects.toThrow(/Could not find DID/);
    }
  }, 30000);

  test.skip('Can disconnect from node', async () => {
    await dock.disconnect();
    expect(!!dock.api).toBe(false);
  });
});
