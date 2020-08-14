import types from '../../src/types.json';
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { FullNodeEndpoint, TestAccountURI, TestKeyringOpts } from '../test-constants';
import { assert, u8aToU8a } from '@polkadot/util';
import Bytes from '@polkadot/types/primitive/Bytes';
import StorageKey from '@polkadot/types/primitive/StorageKey';

describe('Master Module', () => {
  // node client
  let nc;

  beforeAll(async (done) => {
    nc = await connect();
    done();
  }, 40000);

  afterAll(async () => {
    await nc.disconnect();
  }, 10000);

  test('scale endoding of call', async () => {
    /// TODO: these key-value declarations should be randomly generated for all tests
    let key = add_len_prefix([0xaa, 0xbb]);
    let val = add_len_prefix([0xcc, 0xdd]);

    // construct call
    let call = nc.tx.system.setStorage([(key, val)]);

    // sign call
    let proposal = [...nc.createType('Call', call).toU8a()];
    assert(array_eq(proposal, [0, 6, 4, 8, 204, 221, 0]), proposal);
    let payload = {
      proposal,
      round_no: 0,
    };
    let encoded_state_change = nc.createType('StateChange', { MasterVote: payload }).toU8a();
    assert(uint8array_eq(
      encoded_state_change,
      new Uint8Array([
        6, // enum tag?
        28,
        0, 6, 4, 8, 204, 221, 0, // encoded call
        0, 0, 0, 0, 0, 0, 0, 0 // padding?
      ])
    ), encoded_state_change);
  })

  test('control: set and get bytes as sudo', async () => {
    let key = add_len_prefix([0xaa, 0xba]);
    let val = add_len_prefix([0xcc, 0xda]);

    // construct call
    let call = nc.tx.system.setStorage([(key, val)]);
    let sudocall = nc.tx.sudo.sudo(call);
    await sign_send_tx(sudocall);
    let sto = await nc.rpc.state.getStorage(key);
    assert(uint8array_eq(sto.unwrap(), val), "storage item should have been set");
  }, 40000)

  test('Can authenticate and execute a root call', async () => {
    let key = add_len_prefix([0xaa, 0xbb]);
    let val = add_len_prefix([0xcc, 0xdd]);

    // construct call
    let call = nc.tx.system.setStorage([(key, val)]);

    // sign call
    let payload = {
      proposal: [...nc.createType('Call', call).toU8a()],
      round_no: await nc.query.master.round(),
    };
    let encoded_state_change = nc.createType('StateChange', { MasterVote: payload }).toU8a();

    // submit without votes
    await (async () => {
      let res = await sign_send_tx(nc.tx.master.execute(call, []));
      assert(res.status.isFinalized, "transaction was not included in block");
      let sto = await nc.rpc.state.getStorage(key);
      assert(sto.isNone, "storage item should not have been set");
    })();

    // submit with invalid votes
    await (async () => {
      let res = await sign_send_tx(nc.tx.master.execute(call, todo("pass some invalid sigs")));
      assert(res.status.isFinalized, "transaction was not included in block");
      let sto = await nc.rpc.state.getStorage(key);
      assert(sto.isNone, "storage item should not have been set");
    })();

    // submit with valid votes
    await (async () => {
      const bts = str => new TextEncoder("utf-8").encode(str);
      const did_to_key = [
        [
          bts("Alice\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0"),
          await keypair(bts("Alicesk\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0"))
        ],
        [
          bts("Bob\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0"),
          await keypair(bts("Bobsk\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0"))
        ],
        [
          bts("Charlie\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0"),
          await keypair(bts("Charliesk\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0"))
        ],
      ];
      let votes = new Map();
      for (let [did, key] of did_to_key) {
        votes.set(did, { Sr25519: key.sign(encoded_state_change) });
      }
      let res = await sign_send_tx(nc.tx.master.execute(call, votes));
      assert(res.status.isFinalized, "transaction was not included in block");
      let sto = await nc.rpc.state.getStorage(new Bytes(null, [0xaa, 0xbb]).toU8a());
      let bytes = sto.unwrap(); // this value is expected not to be None
      assert(uint8array_eq(bytes, val), "storage item should have been set");
    })();
  }, 40000);
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
async function keypair(seed /* Uint8Array */) {
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
  let key = keyring.addFromUri('//Alice');
  return key
}

// prepend a length tag to a byte list
// tag will encoded according to "Scale Codec"
function add_len_prefix(bs /* array of integers */) {
  assert(bs instanceof Array);
  return new Bytes(null, bs).toU8a()
}

function todo(t) {
  throw t || "TODO";
}

function uint8array_eq(a, b) {
  assert(a instanceof Uint8Array);
  assert(b instanceof Uint8Array);
  return a.byteLength === b.byteLength && a.every((_, i) => a[i] === b[i]);
}

function array_eq(a, b) {
  assert(a instanceof Array);
  assert(b instanceof Array);
  return a.length === b.length && a.every((_, i) => a[i] === b[i]);
}
