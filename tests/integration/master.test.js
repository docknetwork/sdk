import types from '../../src/types.json';
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { cryptoWaitReady, randomAsU8a } from '@polkadot/util-crypto';
import { FullNodeEndpoint, TestAccountURI, TestKeyringOpts } from '../test-constants';
import { assert, u8aToHex, stringToU8a } from '@polkadot/util';

const ALICE_DID = u8aToHex(stringToU8a("Alice\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0"));
const BOB_DID = u8aToHex(stringToU8a("Bob\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0"));
const CHARLIE_DID = u8aToHex(stringToU8a("Charlie\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0"));
const ALICE_SK = stringToU8a("Alicesk\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0");
const BOB_SK = stringToU8a("Bobsk\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0");
const CHARLIE_SK = stringToU8a("Charliesk\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0");

describe('Master Module', () => {
  // node client
  let nc;

  beforeAll(async (done) => {
    nc = await connect();
    done();
  }, 40000);

  afterAll(async () => { await nc.disconnect(); }, 10000);

  test('control: set and get bytes as sudo', async () => {
    let key = u8aToHex(randomAsU8a(32));
    let val = u8aToHex(randomAsU8a(32));
    let sudocall = nc.tx.sudo.sudo(nc.tx.system.setStorage([[key, val]]));
    await signSendTx(sudocall);
    let bs = (await nc.rpc.state.getStorage(key)).unwrap();
    expect(u8aToHex(bs)).toEqual(val);
  }, 20000)

  test('Root call with no votes', async () => {
    let key = u8aToHex(randomAsU8a(32));
    let val = u8aToHex(randomAsU8a(32));
    await masterSetStorage(nc, key, val, []);
    let sto = await nc.rpc.state.getStorage(key);
    assert(sto.isNone, "storage item should not have been set");
  }, 20000);

  test('Root call with invalid votes', async () => {
    let key = u8aToHex(randomAsU8a(32));
    let val = u8aToHex(randomAsU8a(32));
    const did_to_key = [
      [ALICE_DID, await keypair(randomAsU8a(32))],
      [CHARLIE_DID, await keypair(randomAsU8a(32))],
    ];
    await masterSetStorage(nc, key, val, did_to_key);
    let sto = await nc.rpc.state.getStorage(key);
    assert(sto.isNone, "storage item should not have been set");
  }, 20000);

  test('Root call with valid votes', async () => {
    let key = u8aToHex(randomAsU8a(32));
    let val = u8aToHex(randomAsU8a(32));
    const did_to_key = [
      [ALICE_DID, await keypair(ALICE_SK)],
      [CHARLIE_DID, await keypair(CHARLIE_SK)],
    ];
    await masterSetStorage(nc, key, val, did_to_key);
    let sto = await nc.rpc.state.getStorage(key);
    let u8a = sto.unwrap();
    expect(u8aToHex(u8a)).toEqual(val);
  }, 20000);

  test('Root call with valid votes but insufficient vote count', async () => {
    let key = u8aToHex(randomAsU8a(32));
    let val = u8aToHex(randomAsU8a(32));
    const did_to_key = [
      [ALICE_DID, await keypair(ALICE_SK)]
    ];
    await masterSetStorage(nc, key, val, did_to_key);
    let sto = await nc.rpc.state.getStorage(key);
    assert(sto.isNone, "storage item should not have been set");
  }, 20000);

  test('Root call with valid votes and oversufficient vote count', async () => {
    let key = u8aToHex(randomAsU8a(32));
    let val = u8aToHex(randomAsU8a(32));
    const did_to_key = [
      [ALICE_DID, await keypair(ALICE_SK)],
      [BOB_DID, await keypair(BOB_SK)],
      [CHARLIE_DID, await keypair(CHARLIE_SK)],
    ];
    await masterSetStorage(nc, key, val, did_to_key);
    let sto = await nc.rpc.state.getStorage(key);
    let u8a = sto.unwrap();
    expect(u8aToHex(u8a)).toEqual(val);
  }, 20000);

  test('Root call with votes not sorted lexically', async () => {
    let key = u8aToHex(randomAsU8a(32));
    let val = u8aToHex(randomAsU8a(32));
    const did_to_key = [
      [BOB_DID, await keypair(BOB_SK)],
      [ALICE_DID, await keypair(ALICE_SK)],
    ];
    await masterSetStorage(nc, key, val, did_to_key);
    let sto = await nc.rpc.state.getStorage(key);
    let u8a = sto.unwrap();
    expect(u8aToHex(u8a)).toEqual(val);
  }, 20000);
});

// connect to running node
async function connect() {
  const extraTypes = {
    Address: 'AccountId',
    LookupSource: 'AccountId',
  };
  return await ApiPromise.create({
    provider: new WsProvider(FullNodeEndpoint),
    types: {
      ...types,
      ...extraTypes,
    },
  });
}

// load a DID kp from secret
async function keypair(seed) {
  await cryptoWaitReady();
  let keyring = new Keyring({ type: 'sr25519' });
  let key = keyring.addFromSeed(seed);
  return key
}

/// sign extrinsic as test account, submit it and wait for it to finalize
async function signSendTx(extrinsic) {
  let key = await getTestAccountKey();
  await extrinsic.signAsync(key);

  const promise = new Promise((resolve, reject) => {
    try {
      let unsubFunc = null;
      return extrinsic.send(({ events = [], status }) => {
        if (status.isFinalized) {
          unsubFunc();
          resolve({
            events,
            status,
          });
        }
      })
        .catch((error) => {
          reject(error);
        })
        .then((unsub) => {
          unsubFunc = unsub;
        });
    } catch (error) {
      reject(error);
    }

    return this;
  });

  return await promise;
}

async function getTestAccountKey() {
  await cryptoWaitReady();
  let keyring = new Keyring(TestKeyringOpts);
  let key = keyring.addFromUri(TestAccountURI);
  return key;
}

async function masterSetStorage(
  nc, // node client
  key, // hex encoded bytes
  val, // hex encoded bytes
  did_to_key, // list of [did, key] pairs with which to vote. dids are hex encoded
) {
  assert(key.startsWith("0x"), "should prefixed with 0x");
  assert(val.startsWith("0x"), "should prefixed with 0x");
  for (let [did, _key] of did_to_key) {
    assert(did.startsWith("0x"), "should prefixed with 0x");
    assert(did.length === 66, "should be 32 bytes");
  }

  let call = nc.tx.system.setStorage([[key, val]]); // this is a root-only extrinsic
  let payload = {
    proposal: [...nc.createType('Call', call).toU8a()],
    round_no: await nc.query.master.round(),
  };
  let encoded_state_change = nc.createType('StateChange', { MasterVote: payload }).toU8a();

  let dtk_sorted = [...did_to_key];
  dtk_sorted.sort(); // this relies on dids being hex encoded

  let votes = new Map();
  for (let [did, key] of dtk_sorted) {
    votes.set(did, { Sr25519: key.sign(encoded_state_change) });
  }
  await signSendTx(nc.tx.master.execute(call, votes));
}
