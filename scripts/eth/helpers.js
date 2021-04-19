import { ethers } from 'ethers';
import Web3 from 'web3';
import { DockAPI } from '../../src/api';
import { endowEVMAddress } from '../../src/utils/evm-utils';

require('dotenv').config();

const {
  FullNodeTCPEndpoint, FullNodeEndpoint, EndowedSecretURI, MinGasPrice, MaxGas,
} = process.env;

export function getTestPrivKeysForEVMAccounts() {
  const alice = '0x348ce564d427a3311b6536bbcff9390d69395b06ed6c486954e971d960fe8709';
  const bob = '0xd7325de5c2c1cf0009fac77d3d04a9c004b038883446b065871bc3e831dcd098';
  const carol = '0xcc505ee6067fba3f6fc2050643379e190e087aeffe5d958ab9f2f3ed3800fa4e';
  const dave = '0x348ce564067fba3f6fc2050643379e190e087aeffe5d958ab9f2f3ed31dcd098';
  return [alice, bob, carol, dave];
}

// Returns some test EVM accounts
export function getTestEVMAccountsFromWeb3(web3) {
  return getTestPrivKeysForEVMAccounts().map((k) => web3.eth.accounts.privateKeyToAccount(k));
}

export function getTestEVMAccountsFromEthers(provider) {
  return getTestPrivKeysForEVMAccounts().map((k) => new ethers.Wallet(k, provider));
}

// Give `amount` of Dock tokens to EVM address. `amount` defaults to the number of tokens required to pay of maximum gas.
// Uses the node endpoint and endowed account seed from environment variable.
export async function endowEVMAddressWithDefault(evmAddr, amount) {
  const dock = new DockAPI();
  await dock.init({
    address: FullNodeEndpoint,
  });
  const keypair = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(keypair);

  return endowEVMAddress(dock, evmAddr, amount);
}

// Get a web3 instance
export function getWeb3(endpoint) {
  const ep = endpoint || FullNodeTCPEndpoint;
  return new Web3(ep);
}

// Get a Ethers instance
export function getEthers(endpoint) {
  const ep = endpoint || FullNodeTCPEndpoint;
  return new ethers.providers.JsonRpcProvider(ep);
}

// Deploy a contract and return the address
export async function deployContract(web3, signer, bytecode, value, gasPrice, gas) {
  const createTransaction = await signer.signTransaction({
    data: bytecode,
    value: value !== undefined ? value : web3.utils.toBN(0),
    gasPrice: gasPrice !== undefined ? gasPrice : web3.utils.toBN(MinGasPrice),
    gas: gas !== undefined ? gas : web3.utils.toBN(MaxGas),
  });
  const createReceipt = await web3.eth.sendSignedTransaction(createTransaction.rawTransaction);
  console.log(`Contract deployed at address ${createReceipt.contractAddress}`);
  return createReceipt.contractAddress;
}

export async function sendEVMTxn(web3, signer, to, bytecode, value, gasPrice, gas) {
  const txn = await signer.signTransaction(
    {
      to,
      data: bytecode,
      value: value !== undefined ? value : web3.utils.toBN(0),
      gasPrice: gasPrice !== undefined ? gasPrice : web3.utils.toBN(MinGasPrice),
      gas: gas !== undefined ? gas : web3.utils.toBN(MaxGas),
    },
  );
  const txnReceipt = await web3.eth.sendSignedTransaction(txn.rawTransaction);
  console.log(`Txn executed (H: ${txnReceipt.transactionHash})`);
  return txnReceipt;
}

// Send Dock tokens, i.e. base currency of chain to EVM address.
export async function sendTokensToEVMAddress(web3, signer, to, amount, gasPrice, gas) {
  // A transfer is an EVM transaction with no data.
  return sendEVMTxn(web3, signer, to, 0, amount, gasPrice, gas);
}

// Get token balance from an ERC-20 contract
export async function getTokenBalance(web3, contractAddress, abi, address) {
  const contract = new web3.eth.Contract(abi, contractAddress);
  return contract.methods.balanceOf(address).call();
}

// Send ERC-20 tokens
export async function sendTokens(web3, signer, contractAddress, abi, to, amount, gasPrice, gas) {
  const contract = new web3.eth.Contract(abi, contractAddress);
  const encoded = contract.methods.transfer(to, amount).encodeABI();

  const transferTransaction = await signer.signTransaction(
    {
      to: contractAddress,
      data: encoded,
      value: web3.utils.toBN(0),
      gasPrice: gasPrice !== undefined ? gasPrice : web3.utils.toBN(MinGasPrice),
      gas: gas !== undefined ? gas : web3.utils.toBN(MaxGas),
    },
  );

  const transferReceipt = await web3.eth.sendSignedTransaction(transferTransaction.rawTransaction);
  console.log(`Transfer executed to ${transferReceipt.to} (H: ${transferReceipt.transactionHash})`);
  return transferReceipt;
}

// Get transaction receipt
export async function getReceipt(web3, txnHash) {
  return web3.eth.getTransactionReceipt(txnHash);
}

// Get transaction receipt
export async function getTxn(web3, txnHash) {
  return web3.eth.getTransaction(txnHash);
}
