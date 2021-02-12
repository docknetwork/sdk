import { DockAPI } from '../../src/api';
import {getBalance} from '../../src/utils/chain-ops';
import {blake2AsHex, decodeAddress, encodeAddress} from '@polkadot/util-crypto';

require('dotenv').config();


const { FullNodeEndpoint } = process.env;

const alice = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

// 5FrLxJsyJ5x9n2rmxFwosFraxFCKcXZDngRLNectCn64UjtZ

// console.log(`0x${blake2AsHex(decodeAddress(alice), 256)}`);
// console.log(`0x${blake2AsHex(decodeAddress(alice), 256).substring(26)}`);


// TODO: Add Network prefixes

export function addressToH160(address) {
  const bytes = decodeAddress(address);
  return Array.from(bytes.slice(0, 20));
}

export function addressToEvmAddr(address) {
  const h160 = addressToH160(address);
  const preimage = ('evm:'.split('').map((c) => c.charCodeAt())).concat(h160);
  return blake2AsHex(preimage);
}

export async function depositToEvm(dock, keypair, address, amount) {
  // const h160 = addressToH160(address);
  // const txn = dock.api.tx.emv.deposit(h160);
  const addrEvm = encodeAddress(addressToEvmAddr(address));
  const transfer = dock.api.tx.balances.transfer(addrEvm, amount);
  dock.setAccount(keypair);
  return dock.signAndSend(transfer, false);
  // return transferDock(dock.api, keypair, addrEvm, amount);
}

async function main() {
  const dock = new DockAPI();
  await dock.init({
    address: FullNodeEndpoint,
  });

  const aliceEvm = encodeAddress(addressToEvmAddr(alice));

  console.info(`Balance of ${alice} is ${await getBalance(dock.api, alice)}`);
  console.info(`Balance of ${aliceEvm} is ${await getBalance(dock.api, aliceEvm)}`);

  const keypair = dock.keyring.addFromUri('//Alice');
  let r = await depositToEvm(dock, keypair, alice, 50054000000);
  console.log(r);

  console.info(`Balance of ${alice} is ${await getBalance(dock.api, alice)}`);
  console.info(`Balance of ${aliceEvm} is ${await getBalance(dock.api, aliceEvm)}`);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
