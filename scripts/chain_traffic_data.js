import dock from '../src/api';
import {getLastBlock, getBlockNo, getBlock, getBlockDerived} from "../src/utils/chain-ops";
import {median} from "./helpers";

require('dotenv').config();

const { FullNodeEndpoint } = process.env;

async function getTxnsCountInLastBlocks(count = 10) {
  // TODO: Use the derived version once available to fetch the block to get the author as well.
  const lastBlock = await getLastBlock(dock.api);
  // console.log(lastBlock.header.parentHash.toString());
  // const lastBlockNo = getBlockNo(lastBlock);
  const blocks = [lastBlock];
  let parentHash = lastBlock.header.parentHash;
  while (parentHash !== new Uint8Array(32) && blocks.length < count) {
    const block = await getBlock(dock.api, parentHash.toString());
    // const header = await getBlockDerived(dock.api, currentBlockNo);
    // console.log(block.header.hash, block.header.number.toNumber());
    // console.log(header);
    // console.log((await getHeader(dock.api, header.hash)));
    blocks.push(block);
    parentHash = lastBlock.header.parentHash;
  }
  blocks.reverse();
  // const extrinsicsCount = blocks.reduce((totalExt, b) => totalExt + b.extrinsics.length, 0);
  const extrinsicsCounts = blocks.map((b) => b.extrinsics.length);
  // console.log(extrinsicsCounts);
  const total = extrinsicsCounts.reduce((a, b) => a + b, 0);
  const mean = Math.round(total / extrinsicsCounts.length);
  const mid = median(extrinsicsCounts);
  console.log(`For ${blocks.length} blocks, total extrinsic count is ${total}, mean is ${mean} and median is ${mid}`);
  return [blocks.length, total, mean, mid];
}

async function main() {
  await dock.init({
    address: FullNodeEndpoint,
  });
  await getTxnsCountInLastBlocks();
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
