// Transfer Dock tokens to EVM account and withdraw it back

import {
  getTestEVMAccountsFromWeb3, getWeb3, sendTokensToEVMAddress,
} from './helpers';

import { DockAPI } from '../../src/api';

import { getBalance } from '../../src/utils/chain-ops';
import {
  endowEVMAddress,
  evmAddrToSubstrateAddr, substrateAddrToEVMAddr,
} from '../../src/utils/evm-utils';

require('dotenv').config();

const { FullNodeEndpoint, EndowedSecretURI } = process.env;

async function main() {
  const web3 = getWeb3();

  // Create a EVM account Carol
  const [, , carol] = getTestEVMAccountsFromWeb3(web3);

  const dock = new DockAPI();
  await dock.init({
    address: FullNodeEndpoint,
  });

  // Jacob has Dock tokens and will send tokens to Carol.
  const jacob = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(jacob);

  // Endow Carol.
  await endowEVMAddress(dock, carol.address);

  // Every EVM address has a mapping to Substrate address whose balance is deducted for fee when the EVM address does a transaction.
  const carolSubsAddr = evmAddrToSubstrateAddr(carol.address);
  console.log(`Querying balance of Carol's address using web3 ${(await web3.eth.getBalance(carol.address))}`);
  console.log(`Querying balance of Carol's address using polkadot-js ${(await getBalance(dock.api, carolSubsAddr, false))}`);

  // Withdraw some tokens from EVM address, i.e. Carol to Jacob.
  // Create an intermediate EVM address
  const intermediateAddress = substrateAddrToEVMAddr(jacob.address);
  console.log((await web3.eth.getBalance(intermediateAddress)));

  // Carol sends tokens to the intermediate EVM address
  await sendTokensToEVMAddress(web3, carol, intermediateAddress, 1000);

  console.log((await web3.eth.getBalance(intermediateAddress)));

  // Withdraw from the intermediate address to the Substrate address sending this transaction, i.e. Jacob
  const withdraw = dock.api.tx.evm.withdraw(intermediateAddress, 1000);
  await dock.signAndSend(withdraw, false);
  await dock.disconnect();

  console.log((await web3.eth.getBalance(intermediateAddress)));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
