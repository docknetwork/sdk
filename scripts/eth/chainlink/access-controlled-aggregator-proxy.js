import {
  deployContract, getTestEVMAccountsFromWeb3, getWeb3, endowEVMAddressWithDefault, sendEVMTxn,
} from '../helpers';
import {
  AccessControlledAggregatorByteCode,
  AccessControlledAggregatorABI,
  EACAggregatorProxyByteCode,
  EACAggregatorProxyABI,
  DeviationFlaggingValidatorABI,
  FlagsABI,
} from './bytecodes-and-abis';
import { addOracles, fund } from './helpers';

async function deployAggregator(web3, signer, linkTokenAddr, paymentAmount, timeout, validator, minSubmissionValue, maxSubmissionValue, decimals, description) {
  console.log('Deploying AccessControlledAggregator');
  const argsABI = web3.eth.abi.encodeParameters(['address', 'uint128', 'uint32', 'address', 'int256', 'int256', 'uint8', 'string'], [linkTokenAddr, paymentAmount, timeout, validator, minSubmissionValue, maxSubmissionValue, decimals, description]);
  const contractBytecode = AccessControlledAggregatorByteCode + argsABI.slice(2);
  return deployContract(web3, signer, contractBytecode);
}

async function deployProxy(web3, signer, aggregatorAddr) {
  console.log('Deploying EACAggregatorProxy');
  // The aggregator contract extends the access controller as well, thus both arguments are same.
  const contractBytecode = EACAggregatorProxyByteCode + web3.eth.abi.encodeParameters(['address', 'address'], [aggregatorAddr, aggregatorAddr]).slice(2);
  return deployContract(web3, signer, contractBytecode);
}

async function main() {
  const web3 = getWeb3();

  const [alice, bob, carol] = getTestEVMAccountsFromWeb3(web3);
  await endowEVMAddressWithDefault(alice.address);
  await endowEVMAddressWithDefault(bob.address);
  await endowEVMAddressWithDefault(carol.address);

  // Link token contract address
  const linkTokenAddr = '0xa8F3e277740b7c40Ab684cB1b69F69159EF592f6';
  const paymentAmount = 10;
  const timeout = 600;
  // Deviation flagging validator, check script deviation-flag-validator.js
  const validatorAddr = '0xF4F1d669D0D9Ccb14eF2463fB22cB998F4D8FC12';
  const minSubmissionValue = 0;
  const maxSubmissionValue = 10000;
  const decimals = 3;
  const description = 'AccessControlledAggregator for Dock USD price feed';

  const aggregatorAddr = await deployAggregator(web3, alice, linkTokenAddr, paymentAmount, timeout, validatorAddr, minSubmissionValue, maxSubmissionValue, decimals, description);
  const aggregator = new web3.eth.Contract(AccessControlledAggregatorABI, aggregatorAddr);

  // Fund the aggregator
  await fund(web3, alice, linkTokenAddr, aggregatorAddr, aggregator);

  // Add 2 oracles
  await addOracles(web3, alice, aggregatorAddr, aggregator, bob, carol);

  // Adding an address for testing that access control works. Not needed in real deployment.
  await sendEVMTxn(web3, alice, aggregatorAddr, aggregator.methods.addAccess('0x0000000000000000000000000000000000000000').encodeABI());

  const proxyAddr = await deployProxy(web3, alice, aggregatorAddr);
  const proxy = new web3.eth.Contract(EACAggregatorProxyABI, proxyAddr);

  // Fetch current aggregator address from proxy
  const aggrFromProxyAddr = await proxy.methods.aggregator().call();
  const aggrFromProxyContract = new web3.eth.Contract(AccessControlledAggregatorABI, aggrFromProxyAddr);

  console.log((await aggrFromProxyContract.methods.hasAccess('0x0000000000000000000000000000000000000000', []).call()));
  console.log((await aggrFromProxyContract.methods.hasAccess('0x0000000000000000000000000000000000000001', []).call()));
  console.log((await aggrFromProxyContract.methods.hasAccess(alice.address, []).call()));

  // Load Flags contract
  const validator = new web3.eth.Contract(DeviationFlaggingValidatorABI, validatorAddr);
  const flagsAddr = await validator.methods.flags().call();
  const flagsContract = new web3.eth.Contract(FlagsABI, flagsAddr);

  // Oracle's round state above should decide the round number
  const submitCall1 = aggrFromProxyContract.methods.submit(1, 50).encodeABI();
  await sendEVMTxn(web3, bob, aggrFromProxyAddr, submitCall1);

  // There would be no flags raised for the aggregator
  console.log((await flagsContract.methods.getFlag(aggrFromProxyAddr).call()));

  console.log((await aggrFromProxyContract.methods.latestRoundData().call()));

  // Need to wait for timeout.
  // const submitCall2 = aggrFromProxyContract.methods.submit(2, 60).encodeABI();
  // await sendEVMTxn(web3, carol, aggrFromProxyAddr, submitCall2);
  //
  // // There would be a flag raised
  // console.log((await flagsContract.methods.getFlag(aggrFromProxyAddr).call()));

  process.exit(0);
}

main().catch((err) => {
  console.log('Error', err);
});
