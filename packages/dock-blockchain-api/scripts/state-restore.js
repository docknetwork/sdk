// Read key-value pairs downloaded from chain and write them back. Used when restoring testnet.
import fs from "fs";

import { DockAPI } from "../src/index";

require("dotenv").config();

const { FullNodeEndpoint, SudoSecretURI } = process.env;

// Filesystem paths of JSON file containing state dump of few modules
const anchorsPath = ""; // To be filled
const blobsPath = ""; // To be filled
const didsPath = ""; // To be filled
const revokPath = ""; // To be filled

async function sendSetStorageTxn(dock, keyValue) {
  const storageTxn = dock.api.tx.system.setStorage(keyValue);
  const txn = dock.api.tx.sudo.sudoUncheckedWeight(storageTxn, 100);
  const { status } = await dock.signAndSend(txn, false);
  return status.asInBlock;
}

async function loadFromFileAndSet(dock, filePath) {
  const file = fs.readFileSync(filePath);
  const kv = JSON.parse(file).result;
  return sendSetStorageTxn(dock, kv);
}

async function main() {
  const dock = new DockAPI();
  await dock.init({
    address: FullNodeEndpoint,
  });
  const account = dock.keyring.addFromUri(SudoSecretURI);
  dock.setAccount(account);

  console.log(
    `Written in block ${await loadFromFileAndSet(dock, anchorsPath)}`,
  );

  console.log(`Written in block ${await loadFromFileAndSet(dock, blobsPath)}`);

  console.log(`Written in block ${await loadFromFileAndSet(dock, didsPath)}`);

  console.log(`Written in block ${await loadFromFileAndSet(dock, revokPath)}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
