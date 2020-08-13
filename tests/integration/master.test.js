import types from '../../src/types.json';
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { FullNodeEndpoint, TestAccountURI, TestKeyringOpts } from '../test-constants';
import { assert, u8aToU8a } from '@polkadot/util';
import Bytes from '@polkadot/types/primitive/Bytes';

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

  test('Can authenticate and execute a root call', async () => {
    let key = add_len_prefix([0xaa, 0xbb]);
    let val = add_len_prefix([0xcc, 0xdd]);

    // construct call
    let call = nc.tx.system.setStorage([(key, val)]);

    // sign call
    let payload = {
      proposal: nc.createType('Call', call).toU8a(),
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

    // // submit with invalid votes
    // await (async () => {
    //   let res = await sign_send_tx(nc.tx.master.execute(call, ));
    //   assert(res.status.isFinalized, "transaction was not included in block");
    //   let sto = await nc.rpc.state.getStorage(key);
    //   assert(sto.isNone, "storage item should not have been set");
    // })();

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
      let votes = new Set(did_to_key.map(([did, key]) => {
        let sig = key.sign(encoded_state_change);
        return [did, { Sr25519: sig }]
      }));
      let res = await sign_send_tx(nc.tx.master.execute(call, votes));
      assert(res.status.isFinalized, "transaction was not included in block");
      let sto = await nc.rpc.state.getStorage(key);
      assert(sto.asSome === val, "storage item should have been set");
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

// sign a payload using DID kp
function sign(kp, payload) {
  assert(Uint8Array)
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
  return new Bytes(null, bs).toU8a()
}

function todo(t) {
  throw t || "TODO";
}
