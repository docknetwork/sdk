import types from '../../src/types.json';
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { FullNodeEndpoint, TestAccountURI, TestKeyringOpts } from '../test-constants';
import { assert } from '@polkadot/util';
import Bytes from '@polkadot/types/primitive/Bytes';

const ALICE_DID = bts("Alice\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0");
const BOB_DID = bts("Bob\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0");
const CHARLIE_DID = bts("Charlie\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0");
const ALICE_SK = bts("Alicesk\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0");
const BOB_SK = bts("Bobsk\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0");
const CHARLIE_SK = bts("Charliesk\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0");

describe('Master Module', () => {
  // node client
  let nc;

  beforeAll(async (done) => {
    nc = await connect();
    done();
  }, 40000);

  afterAll(async () => { await nc.disconnect(); }, 10000);

  test('scale endoding of call', async () => {
    // prepend a length tag to a byte list
    // tag will encoded according to "Scale Codec"
    function add_len_prefix(bs) {
      return new Bytes(null, bs).toU8a()
    }

    let key = add_len_prefix([0xaa, 0xbb]);
    let val = add_len_prefix([0xcc, 0xdd]);

    let call = nc.tx.system.setStorage([(key, val)]);
    let proposal = [...nc.createType('Call', call).toU8a()];
    expect(proposal).toEqual([0, 6, 4, 8, 204, 221, 0]);
    let payload = {
      proposal,
      round_no: 0,
    };
    let encoded_state_change = nc.createType('StateChange', { MasterVote: payload }).toU8a();
    expect(encoded_state_change).toEqual(new Uint8Array([
      6, // enum tag
      7 << 2, // length tag of encoded call
      0, 6, 4, 8, 204, 221, 0, // encoded call
      0, 0, 0, 0, 0, 0, 0, 0 // 64 bit round number
    ]));
  })

  test('control: set and get bytes as sudo', async () => {
    let key = u8a_hex(randomish_u8a());
    let val = u8a_hex(randomish_u8a());
    let sudocall = nc.tx.sudo.sudo(nc.tx.system.setStorage([[key, val]]));
    await sign_send_tx(sudocall);
    let bs = (await nc.rpc.state.getStorage(key)).unwrap();
    expect(u8a_hex(bs)).toEqual(val);
  }, 20000)

  test('Root call with no votes', async () => {
    let key = u8a_hex(randomish_u8a());
    let val = u8a_hex(randomish_u8a());
    await master_set_storage(nc, key, val, []);
    let sto = await nc.rpc.state.getStorage(key);
    assert(sto.isNone, "storage item should not have been set");
  }, 20000);

  test('Root call with invalid votes', async () => {
    let key = u8a_hex(randomish_u8a());
    let val = u8a_hex(randomish_u8a());
    const did_to_key = [
      [ALICE_DID, await keypair(randomish_u8a())],
      [CHARLIE_DID, await keypair(randomish_u8a())],
    ];
    await master_set_storage(nc, key, val, did_to_key);
    let sto = await nc.rpc.state.getStorage(key);
    assert(sto.isNone, "storage item should not have been set");
  }, 20000);

  test('Root call with valid votes', async () => {
    let key = u8a_hex(randomish_u8a());
    let val = u8a_hex(randomish_u8a());
    const did_to_key = [
      [ALICE_DID, await keypair(ALICE_SK)],
      [CHARLIE_DID, await keypair(CHARLIE_SK)],
    ];
    await master_set_storage(nc, key, val, did_to_key);
    let sto = await nc.rpc.state.getStorage(key);
    let u8a = sto.unwrap();
    expect(u8a_hex(u8a)).toEqual(val);
  }, 20000);

  test('Root call with valid votes but insufficient vote count', async () => {
    let key = u8a_hex(randomish_u8a());
    let val = u8a_hex(randomish_u8a());
    const did_to_key = [
      [ALICE_DID, await keypair(ALICE_SK)]
    ];
    await master_set_storage(nc, key, val, did_to_key);
    let sto = await nc.rpc.state.getStorage(key);
    assert(sto.isNone, "storage item should not have been set");
  }, 20000);

  test('Root call with valid votes and oversufficient vote count', async () => {
    let key = u8a_hex(randomish_u8a());
    let val = u8a_hex(randomish_u8a());
    const did_to_key = [
      [ALICE_DID, await keypair(ALICE_SK)],
      [BOB_DID, await keypair(BOB_SK)],
      [CHARLIE_DID, await keypair(CHARLIE_SK)],
    ];
    await master_set_storage(nc, key, val, did_to_key);
    let sto = await nc.rpc.state.getStorage(key);
    let u8a = sto.unwrap();
    expect(u8a_hex(u8a)).toEqual(val);
  }, 20000);

  test('Root call with votes not sorted lexically', async () => {
    let key = u8a_hex(randomish_u8a());
    let val = u8a_hex(randomish_u8a());
    const did_to_key = [
      [BOB_DID, await keypair(BOB_SK)],
      [ALICE_DID, await keypair(ALICE_SK)],
    ];
    await master_set_storage(nc, key, val, did_to_key);
    let sto = await nc.rpc.state.getStorage(key);
    let u8a = sto.unwrap();
    expect(u8a_hex(u8a)).toEqual(val);
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
  assert(seed instanceof Uint8Array);
  await cryptoWaitReady();
  let keyring = new Keyring({ type: 'sr25519' });
  let key = keyring.addFromSeed(seed);
  return key
}

async function sign_send_tx(extrinsic) {
  let key = await get_test_account_key();
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

async function get_test_account_key() {
  await cryptoWaitReady();
  let keyring = new Keyring(TestKeyringOpts);
  let key = keyring.addFromUri(TestAccountURI);
  return key
}

// represent a Uint8Array as hex with a "0x" prefix
function u8a_hex(bs) {
  assert(bs instanceof Uint8Array);
  return '0x' + [...bs].map(bt => ('0' + bt.toString(16)).slice(-2)).join('');
}
expect(u8a_hex(new Uint8Array([]))).toEqual('0x');
expect(u8a_hex(new Uint8Array([0x01]))).toEqual('0x01');
expect(u8a_hex(new Uint8Array([0xaa, 0xbb]))).toEqual('0xaabb');

function randomish_u8a() {
  let ret = new Uint8Array(32);
  for (let i = 0; i < ret.length; i++) {
    ret[i] = Math.random() * (2 ** 8);
  }
  return ret;
}

async function master_set_storage(
  nc, // node client
  key, // hex encoded bytes
  val, // hex encoded bytes
  did_to_key, // list of (did, key) pairs with which to vote
) {
  let call = nc.tx.system.setStorage([[key, val]]); // this is a root-only extrinsic
  let payload = {
    proposal: [...nc.createType('Call', call).toU8a()],
    round_no: await nc.query.master.round(),
  };
  let encoded_state_change = nc.createType('StateChange', { MasterVote: payload }).toU8a();

  let dtk_sorted = [...did_to_key];
  dtk_sorted.sort(([dida, _a], [didb, _b]) => compare_u8a_32(dida, didb));

  let votes = new Map();
  for (let [did, key] of dtk_sorted) {
    votes.set(did, { Sr25519: key.sign(encoded_state_change) });
  }
  await sign_send_tx(nc.tx.master.execute(call, votes));
}

/// convert a string to utf-8 encoded bytes
function bts(str) {
  return new Uint8Array([...new TextEncoder("utf-8").encode(str)]);
}

// return -1 if a < b, 0 if a == b, 1 if a > b
function compare_u8a_32(a, b) {
  assert(a instanceof Uint8Array);
  assert(b instanceof Uint8Array);
  assert(a.length === 32);
  assert(b.length === 32);
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) {
      return -1;
    } else if (b[i] < a[i]) {
      return 1;
    }
  }
  return 0;
}
