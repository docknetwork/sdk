// Download important state from node and write to JSON file in the same directory

import dock from "../src/index";
import { asDockAddress } from "../src/utils/codec";

require("dotenv").config();

const fs = require("fs");

const { FullNodeEndpoint, Network } = process.env;

if (process.argv.length !== 3) {
  console.error("Need only 1 argument which is the name of dump file");
  process.exit(1);
}

async function storageMapEntriesToObject(entries) {
  const ret = {};
  entries.forEach((entry) => {
    ret[entry[0].args[0]] = entry[1].toJSON();
  });
  return ret;
}

async function storageDoubleMapEntriesToObject(entries) {
  const ret = {};
  entries.forEach((entry) => {
    const key1 = entry[0].args[0];
    if (ret[key1] === undefined) {
      ret[key1] = {};
    }
    const key2 = entry[0].args[1];
    ret[key1][key2] = entry[1].toJSON();
  });
  return ret;
}

async function downloadAccounts() {
  const accounts = await dock.api.query.system.account.entries();
  const ret = {};
  accounts.forEach((entry) => {
    console.log(entry[0].args)
    ret[asDockAddress(entry[0].args[0], Network)] = entry[1].toJSON();
  });
  return ret;
}

async function downloadAccountLocks() {
  const accounts = await dock.api.query.balances.locks.entries();
  const ret = {};
  accounts.forEach((entry) => {
    ret[asDockAddress(entry[0].args[0], Network)] = entry[1].toJSON();
  });
  return ret;
}

async function downloadMigs() {
  const m = await dock.api.query.migrationModule.migrators.entries();
  const b = await dock.api.query.migrationModule.bonuses.entries();
  return {
    migrators: storageMapEntriesToObject(m),
    bonuses: storageMapEntriesToObject(b),
  };
}

async function downloadAnchors() {
  const anchors = await dock.api.query.anchor.anchors.entries();
  return storageMapEntriesToObject(anchors);
}

async function downloadAttests() {
  const attests = await dock.api.query.attest.attestations.entries();
  return storageMapEntriesToObject(attests);
}

async function downloadBlobs() {
  const blobs = await dock.api.query.blobStore.blobs.entries();
  return storageMapEntriesToObject(blobs);
}

async function downloadDids() {
  const dids = await dock.api.query.didModule.dids.entries();
  return storageMapEntriesToObject(dids);
}

async function downloadRegs() {
  const regs = await dock.api.query.revoke.registries.entries();
  return storageMapEntriesToObject(regs);
}

async function downloadRevs() {
  const revocations = await dock.api.query.revoke.revocations.entries();
  return storageDoubleMapEntriesToObject(revocations);
}

async function downloadEvmAccountCode() {
  const code = await dock.api.query.evm.accountCodes.entries();
  return storageMapEntriesToObject(code);
}

async function downloadEvmAccountStorage() {
  const storages = await dock.api.query.evm.accountStorages.entries();
  return storageDoubleMapEntriesToObject(storages);
}

async function downloadPoAState() {
  const supply = await dock.api.query.poAModule.emissionSupply();
  const poaLastBlock = await dock.api.query.poAModule.poALastBlock();
  return {
    supply,
    poaLastBlock,
  };
}

async function downloadState() {
  const accounts = await downloadAccounts();

  const locks = await downloadAccountLocks();

  const totalIssuance = await dock.api.query.balances.totalIssuance();

  const { migrators, bonuses } = await downloadMigs();

  const anchors = await downloadAnchors();

  const attests = await downloadAttests();

  const blobs = await downloadBlobs();

  const dids = await downloadDids();

  const regs = await downloadRegs();

  const revs = await downloadRevs();

  const evmCodes = await downloadEvmAccountCode();

  const evmStorages = await downloadEvmAccountStorage();

  const poaState = await downloadPoAState();

  const treasuryBal = await dock.api.rpc.poa.treasuryBalance();

  const obj = {
    accounts,
    locks,
    totalIssuance,
    migrators,
    bonuses,
    anchors,
    attests,
    blobs,
    dids,
    regs,
    revs,
    evmCodes,
    evmStorages,
    poaState,
    treasuryBal,
  };

  const dumpFileName = process.argv[2];
  fs.writeFileSync(`./${dumpFileName}`, JSON.stringify(obj));
  process.exit(0);
}

dock.init({
  address: FullNodeEndpoint,
})
  .then(downloadState)
  .catch((error) => {
    console.error("Error occurred somewhere, it was caught!", error);
    process.exit(1);
  });
