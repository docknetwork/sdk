import { encodeAddress } from '@polkadot/util-crypto';

import { DockAPI } from '../src/api';

const dock = new DockAPI();


async function getBlockDetails(dock, blockHash) {
  const header = await dock.api.derive.chain.getHeader(blockHash);
  console.log(`Block header is ${header}`);
  const slotNo = header.digest.logs[0].asPreRuntime[1];
  // console.log(`Slot number is ${slotNo}`);
  console.log(`Slot number is ${dock.api.createType('u64', slotNo)} and Block number is ${header.number}`);
  console.log(`Block author is ${header.author}`);
  return [dock.api.createType('u64', slotNo), header.number, header.author];
}

async function getEpochMetrics(dock) {
  console.log('Epochs');
  const epochs = await dock.api.query.poAModule.epochs.entries();
  // console.log(epochs);
  epochs.forEach(element => {
    // console.log(element[0]);
    // console.log(element[0]._meta.type);
    // const epochNo = dock.api.createType('u32', element[0]);
    const epochNo = element[0].toHuman();
    console.log(`epoch no ${epochNo}`);
    const lastSlot = element[1][2].isSome ? element[1][2].unwrap() : 'Nil';
    console.log(`No of validators: ${element[1][0]}, Starting slot: ${element[1][1]}, ending slot ${lastSlot}`);
    // console.log(element[1][2]);
  });
  console.log('Epoch block counts');
  const epochBlockCounts = await dock.api.query.poAModule.epochBlockCounts.entries();
  // console.log(epochBlockCounts);
  epochBlockCounts.forEach(element => {
    // console.log(Object.getOwnPropertyNames(element[0]));
    // console.log(element[0]._args[0]);
    // console.log(element[0].registry);
    const epochNo = element[0]._args[0];
    const validatorId = encodeAddress(element[0]._args[1]);
    console.log(`epoch no ${epochNo}, validator id ${validatorId}, blocks ${element[1]}`);
  });
}

async function main() {
  await dock.init({
    address: 'ws://localhost:9944',
  });
  // await getBlockDetails(dock, '0x2747e70f24d4aff7a462f2f34b7cf1b236d0167a1778c8857388f493de48928b');
  await getEpochMetrics(dock);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
