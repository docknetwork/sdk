import { toPairs } from "ramda";
import fs from "fs";
import { withDockAPI } from "./helpers";

const { FullNodeEndpoint, SudoSecretURI } = process.env;
const [_, __, filePath] = process.argv;

async function main(dock, filePath) {
  const keyValuePairs = JSON.parse(fs.readFileSync(filePath));
  console.log("Setting", JSON.stringify(keyValuePairs, null, 2));
  const setStorageTx = dock.api.tx.system.setStorage(toPairs(keyValuePairs));
  return dock.signAndSend(dock.api.tx.sudo.sudo(setStorageTx));
}

withDockAPI({ senderAccountURI: SudoSecretURI, address: FullNodeEndpoint })(
  main
)(filePath).catch(console.error);
