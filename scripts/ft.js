require('dotenv').config();

import { DockAPI } from '../src/api';

const endowed = '5CUrmmBsA7oPP2uJ58yPTjZn7dUpFzD1MtRuwLdoPQyBnyWM';
const endowedSecret = process.env['EndowedSecretURI'];
const sudo = '5CFfPovgr1iLJ4fekiTPmtGMyg7XGmLxUnTvd1Y4GigwPqzH';
const sudoSecret = process.env['SudoSecretURI'];

const base = 250000000;

const FT3 = '5FNdWJ6RjLCJxnew1R1q4GZPjfxmdd3qCuLVPujmjozMGHzb';
const FT3SessKey = '0x8cb38423924bd7f0f0cc9afbd7ac95f327dd8b7122605c1f8439cc2603aa0844959e425d331d43864fd327c4a5198edecf0105f3108d06afe4222399f1f296d6';
const FT4 = '5DXQL7gQWq2Y2rJqZopHiUc9knUa4MCoysTqDVRjBWBiT6gP';
const FT4SessKey = '0x029791683f599d8ead25a290bde02126e4f12697c59fa8e3508be53bece12c749a5c8a5a432d122aacf04c995532c9f9829ab159c0775394944cfd02cf280e60';
const FT5 = '5GHA4YoLXqt5MdE3Sg1B9d563tts4jqg7yKhCcv1qWfF5QHB';
const FT5SessKey = '0x3ea98cbba8bca1d2225288ad933708a74d3cec7ab7b760d33473d930bffea757527808d9c94d335dcc252c743151a6ff2cba0989c2ee638d2d8473b0603d4f6a';
const FT6 = '5DDNFu3jhBvvWNbtK6BvrZiMUvUn6WZUyPPQTHyKD5JDWXHp';
const FT6SessKey = '0x6620f985c3e019a1a66b960c3ae60f40210854d988486f483b46a2109e866f51e7ceaf524630f549d3e973f70a8ea34e680419cba90a7e934021d8936a283fce';
const FT7 = '5Ccaz1mozrwaQiqXmvwykC2FPUDDtQ51tEN2aY5KpDnuNmLN';
const FT7SessKey = '0xd4d561cc6813845f13414013d00104f817dd8479ca16727270a74a3e61636974b77c21760300dfd81df586c344bae8e86b28da19b3dd3575f09f2cda4dac102a';
const FT8 = '5FCFo59AFtZU15yFDTpJyJ74thxjySvFbAJqgut29fh6VXUk';
const FT8SessKey = '0x1685c05750795bcb2bba6d2f969fafff7ad4193472127ba51f0ca2ffe54d0c3a73ded9ca5dc19a3e2c2079da3f9b1fa931fb170234e0c118fd99297e255cfeb0';
const FT9 = '5D2ge4WCCoPw92GZsRntejAGZmXjasktR4xf2bdKNiGTAB2j';
const FT9SessKey = '0xbcb21cf8de9c2087f3101c826a15533e06b110023e9324631ae700c0ec75885433d5c7eca2669d57491416c7a9be4cbe0b0b78e79304eef359ba33757066913e';
const FT10 = '5DFN9pcRFSkyEtX67uAUrpmiBWLtrRwH6bgQX9Kqm7yVDwL4';
const FT10SessKey = '0x76b3a5fb37113aba71fb3c2e66faa32d8cda132720c42500b4744564393d1c0f207e4d20fa034b5eee32c383dd39b17677fc08e602b96ca9f1110db925eaf051';

async function printBalance(dock, name, account) {
  const { data: balance } = await dock.api.query.system.account(account);
  console.log(`${name}'s balance is ${balance.free}`);
}

async function getBalance(dock, account) {
  const { data: balance } = await dock.api.query.system.account(account);
  return balance.free.toHex();
}

async function fuelSudo(dock) {
  const account = dock.keyring.addFromUri(endowedSecret);
  dock.setAccount(account);
  const txn = dock.api.tx.balances.transfer(sudo, base * 10000);
  const r = await dock.sendTransaction(txn, false);
  console.log(`Transaction finalized at blockHash ${r.status.asFinalized}`);
  return r;
}

async function setSessionKeyByProxy(dock, sudoUri, validatorId, keys) {
  console.log('Setting sdk account...');
  const account = dock.keyring.addFromUri(sudoUri);
  dock.setAccount(account);
  const txn = dock.api.tx.sudo.sudo(dock.api.tx.poAModule.setSessionKey(validatorId, keys));
  // console.log(txn);
  const r = await dock.sendTransaction(txn, false);
  console.log(`Transaction finalized at blockHash ${r.status.asFinalized}`);
  return r;
}

async function addValidator(dock, sudoUri, validatorId, shortCircuit) {
  console.log('Setting sdk account...');
  const account = dock.keyring.addFromUri(sudoUri);
  dock.setAccount(account);
  const txn = dock.api.tx.sudo.sudo(dock.api.tx.poAModule.addValidator(validatorId, shortCircuit));
  const r = await dock.sendTransaction(txn, false);
  console.log(`Transaction finalized at blockHash ${r.status.asFinalized}`);
  return r;
}

async function setMaxActiveValidators(dock, sudoUri, count) {
  console.log('Setting sdk account...');
  const account = dock.keyring.addFromUri(sudoUri);
  dock.setAccount(account);
  const txn = dock.api.tx.sudo.sudo(dock.api.tx.poAModule.setMaxActiveValidators(count));
  const { status } = await dock.sendTransaction(txn);
  const blockHash = status.asFinalized;
  console.log(`Transaction finalized at blockHash ${blockHash}`);
  return blockHash;
}

async function main() {
  const dock = new DockAPI();
  await dock.init({
    address: 'wss://testnet-1.dock.io',
  });

  // const r = await fuelSudo(dock);
  // console.log(r);
  // await printBalance(dock, 'Sudo', sudo);

  // const r = await setSessionKeyByProxy(dock, sudoSecret, FT3, FT3SessKey);
  // console.log(r);

  // const r = await setSessionKeyByProxy(dock, sudoSecret, FT4, FT4SessKey);
  // console.log(r);

  // const r = await addValidator(dock, sudoSecret, FT3, false);
  // console.log(r);

  // const r = await addValidator(dock, sudoSecret, FT4, false);
  // console.log(r);

  // const r = await setSessionKeyByProxy(dock, sudoSecret, FT5, FT5SessKey);
  // console.log(r);

  // const r = await setSessionKeyByProxy(dock, sudoSecret, FT6, FT6SessKey);
  // console.log(r);

  // const r = await addValidator(dock, sudoSecret, FT5, false);
  // console.log(r);

  // const r = await addValidator(dock, sudoSecret, FT6, false);
  // console.log(r);

  // const r = await setMaxActiveValidators(dock, sudoSecret, 8);
  // console.log(r);

  // const r = await setSessionKeyByProxy(dock, sudoSecret, FT7, FT7SessKey);
  // console.log(r);

  // const r = await setSessionKeyByProxy(dock, sudoSecret, FT8, FT8SessKey);
  // console.log(r);

  // const r = await addValidator(dock, sudoSecret, FT7, false);
  // console.log(r);

  // const r = await addValidator(dock, sudoSecret, FT8, false);
  // console.log(r);

  // const r = await setMaxActiveValidators(dock, sudoSecret, 10);
  // console.log(r);

  // const r = await setSessionKeyByProxy(dock, sudoSecret, FT9, FT9SessKey);
  // console.log(r);

  // const r = await setSessionKeyByProxy(dock, sudoSecret, FT10, FT10SessKey);
  // console.log(r);

  // const r = await addValidator(dock, sudoSecret, FT9, false);
  // console.log(r);

  // const r = await addValidator(dock, sudoSecret, FT10, false);
  // console.log(r);

  await printBalance(dock, 'Sudo', sudo);

}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
