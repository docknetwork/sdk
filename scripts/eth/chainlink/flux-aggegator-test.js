// Script used by Chainlink to deploy its FluxAggregator contract.

import { AggregatorABI, AggregatorByteCode, LinkTokenABI } from './bytecodes-and-abis';

import {
  deployContract,
  getTestEVMAccountsFromWeb3, getTokenBalance, getWeb3, sendEVMTxn, sendTokens,
} from '../helpers';

async function deploy(web3, signer, linkTokenAddr, paymentAmount, timeout, validator, minSubmissionValue, maxSubmissionValue, decimals, description) {
  const argsABI = web3.eth.abi.encodeParameters(['address', 'uint128', 'uint32', 'address', 'int256', 'int256', 'uint8', 'string'], [linkTokenAddr, paymentAmount, timeout, validator, minSubmissionValue, maxSubmissionValue, decimals, description]);
  const contractBytecode = AggregatorByteCode + argsABI.slice(2);

  return deployContract(web3, signer, contractBytecode);
}

async function fund(web3, signer, linkTokenAddr, contractAddr, contract) {
  // Send Link to Aggregator
  console.log(`Aggregator's token balance: ${(await getTokenBalance(web3, linkTokenAddr, LinkTokenABI, contractAddr))}`);
  await sendTokens(web3, signer, linkTokenAddr, LinkTokenABI, contractAddr, web3.utils.toBN(1000000));
  console.log(`Aggregator's token balance: ${(await getTokenBalance(web3, linkTokenAddr, LinkTokenABI, contractAddr))}`);

  // Let Aggregator update its state to reflect the transferred ether
  const updateFundsCode = contract.methods.updateAvailableFunds().encodeABI();
  await sendEVMTxn(web3, signer, contractAddr, updateFundsCode);
}

async function addOracles(web3, signer, contractAddr, contract, oracle1, oracle2) {
  // Add oracles
  // Keeping the admin same as oracle node as its an example

  const addOracle1Code = contract.methods.changeOracles([], [oracle1.address], [oracle1.address], 1, 1, 0).encodeABI();
  await sendEVMTxn(web3, signer, contractAddr, addOracle1Code);
  console.log(`Oracles: ${(await contract.methods.getOracles().call())}`);

  const addOracle2Code = contract.methods.changeOracles([], [oracle2.address], [oracle2.address], 1, 2, 0).encodeABI();
  await sendEVMTxn(web3, signer, contractAddr, addOracle2Code);
  console.log(`Oracles: ${(await contract.methods.getOracles().call())}`);
}

async function main() {
  const web3 = getWeb3();

  const [alice, bob, carol] = getTestEVMAccountsFromWeb3(web3);

  const linkTokenAddr = '0xEF681D401f60FCBBb5BB32edbcA72a85dD2b7bff';
  const paymentAmount = 10;
  const timeout = 2100;
  const validator = '0x0000000000000000000000000000000000000000';
  const minSubmissionValue = 0;
  const maxSubmissionValue = 1000;
  const decimals = 3;
  const description = 'Dock USD price feed';

  const contractAddr = await deploy(web3, alice, linkTokenAddr, paymentAmount, timeout, validator, minSubmissionValue, maxSubmissionValue, decimals, description);

  const contract = new web3.eth.Contract(AggregatorABI, contractAddr);
  console.log(`Oracles: ${(await contract.methods.getOracles().call())}`);

  await fund(web3, alice, linkTokenAddr, contractAddr, contract);

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
}

main().catch((err) => {
  console.log('Error', err);
});
