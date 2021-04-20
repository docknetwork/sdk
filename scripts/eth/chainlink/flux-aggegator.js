// Script used by Chainlink to deploy its FluxAggregator contract.

import { FluxAggregatorABI, FluxAggregatorByteCode } from './bytecodes-and-abis';

import {
  deployContract, endowEVMAddressWithDefault,
  getTestEVMAccountsFromWeb3, getWeb3, sendEVMTxn,
} from '../helpers';
import { addOracles, fund } from './helpers';

async function deploy(web3, signer, linkTokenAddr, paymentAmount, timeout, validator, minSubmissionValue, maxSubmissionValue, decimals, description) {
  console.log('Deploying FluxAggregator');
  const argsABI = web3.eth.abi.encodeParameters(['address', 'uint128', 'uint32', 'address', 'int256', 'int256', 'uint8', 'string'], [linkTokenAddr, paymentAmount, timeout, validator, minSubmissionValue, maxSubmissionValue, decimals, description]);
  const contractBytecode = FluxAggregatorByteCode + argsABI.slice(2);

  return deployContract(web3, signer, contractBytecode);
}

async function main() {
  const web3 = getWeb3();

  const [alice, bob, carol] = getTestEVMAccountsFromWeb3(web3);
  await endowEVMAddressWithDefault(alice.address);
  await endowEVMAddressWithDefault(bob.address);
  await endowEVMAddressWithDefault(carol.address);

  // Link token contract address
  const linkTokenAddr = '0x8cB6497CDB9D44E168C076B414e4a675ebCC8683';
  const paymentAmount = 10;
  const timeout = 2100;
  const validator = '0x0000000000000000000000000000000000000000';
  const minSubmissionValue = 0;
  const maxSubmissionValue = 1000;
  const decimals = 3;
  const description = 'FluxAggregator for Dock USD price feed';

  const contractAddr = await deploy(web3, alice, linkTokenAddr, paymentAmount, timeout, validator, minSubmissionValue, maxSubmissionValue, decimals, description);

  const contract = new web3.eth.Contract(FluxAggregatorABI, contractAddr);
  console.log(`Oracles: ${(await contract.methods.getOracles().call())}`);

  // Fund the aggregator
  await fund(web3, alice, linkTokenAddr, contractAddr, contract);

  // Add 2 oracles
  await addOracles(web3, alice, contractAddr, contract, bob, carol);

  console.log('Latest round data');
  console.log((await contract.methods.latestRoundData().call()));

  console.log('Round state for Bob');
  console.log((await contract.methods.oracleRoundState(bob.address, 0).call()));

  // Oracle's round state above should decide the round number
  const submitCall1 = contract.methods.submit(1, 40).encodeABI();
  await sendEVMTxn(web3, bob, contractAddr, submitCall1);

  console.log('Round state for Carol');
  console.log((await contract.methods.oracleRoundState(carol.address, 0).call()));

  // Oracle's round state above should decide the round number
  const submitCall2 = contract.methods.submit(1, 90).encodeABI();
  await sendEVMTxn(web3, carol, contractAddr, submitCall2);

  console.log('Latest round data');
  console.log((await contract.methods.latestRoundData().call()));
  process.exit(0);
}

main().catch((err) => {
  console.log('Error', err);
});
