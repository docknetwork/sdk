import { firstValueFrom } from "rxjs";
import { blockByNumber, withDockAPI } from "./helpers";

const { FullNodeEndpoint, BlockNumber } = process.env;

async function main(dock, number) {
  const block = await firstValueFrom(blockByNumber(dock, number));

  console.log("Human:", JSON.stringify(block.toHuman(), void 0, 2), "\n");
  console.log("JSON:", JSON.stringify(block.toJSON(), void 0, 2));
}

withDockAPI({ address: FullNodeEndpoint })(main)(BlockNumber).catch(
  console.error
);
