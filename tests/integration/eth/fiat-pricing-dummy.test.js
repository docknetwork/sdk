import {
  getTestEVMAccountsFromWeb3, endowEVMAddressWithDefault, sendEVMTxn, deployContract, getWeb3,
} from '../../../scripts/eth/helpers';
import {
  DUMMY_AGGREGATOR_BYTECODE, DUMMY_AGGREGATOR_ABI, DUMMY_PROXY_BYTECODE, DUMMY_PROXY_ABI,
} from '../../../scripts/eth/bytecodes-and-abis';

import {
  FullNodeEndpoint, TestAccountURI, MinGasPrice, MaxGas, FullNodeTCPEndpoint,
} from '../../test-constants';
import { defaultEVMAccountEndowment } from '../helpers';

describe('Deploy a dummy aggregator and a proxy contract', () => {
  let alice;
  const web3 = getWeb3(FullNodeTCPEndpoint);

  beforeAll(async () => {
    const [a] = getTestEVMAccountsFromWeb3(web3);
    alice = a;
    await endowEVMAddressWithDefault(alice.address, defaultEVMAccountEndowment(), FullNodeEndpoint, TestAccountURI);
  }, 15000);

  afterAll(async () => {
    await web3.currentProvider.disconnect();
  }, 10000);

  test('It works', async () => {
    // Constructor arguments for the aggregator contract
    const argsABI = web3.eth.abi.encodeParameters(['uint80', 'int256', 'uint256', 'uint256', 'uint80'], [10, 15, 1200, 1200, 10]);
    expect(argsABI).toEqual('0x000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000f00000000000000000000000000000000000000000000000000000000000004b000000000000000000000000000000000000000000000000000000000000004b0000000000000000000000000000000000000000000000000000000000000000a');

    // Deploy aggregator contract
    const aggregatorContractBytecode = DUMMY_AGGREGATOR_BYTECODE + argsABI.slice(2);
    const aggregatorAddress = await deployContract(web3, alice, aggregatorContractBytecode, 0, MinGasPrice, MaxGas);

    // Prepare proxy contract constructor arguments and deploy it
    const proxyArgsABI = web3.eth.abi.encodeParameters(['address'], [aggregatorAddress]).slice(2);
    const proxyAddress = await deployContract(web3, alice, DUMMY_PROXY_BYTECODE + proxyArgsABI, 0, MinGasPrice, MaxGas);

    const proxyContract = new web3.eth.Contract(DUMMY_PROXY_ABI, proxyAddress);

    // Fetch current aggregator address from proxy
    const aggrFromProxyAddr = await proxyContract.methods.aggregator().call();
    const aggrFromProxyContract = new web3.eth.Contract(DUMMY_AGGREGATOR_ABI, aggrFromProxyAddr);

    // Latest round data should match what was passed in the constructor
    let latestRoundData = await aggrFromProxyContract.methods.latestRoundData().call();
    expect(latestRoundData['0']).toEqual('10');
    expect(latestRoundData['1']).toEqual('15');
    expect(latestRoundData['2']).toEqual('1200');
    expect(latestRoundData['3']).toEqual('1200');
    expect(latestRoundData['4']).toEqual('10');
    let answer = await aggrFromProxyContract.methods.answer().call();
    expect(answer).toEqual('15');

    // Update round data
    let setCallAbi = aggrFromProxyContract.methods.setData(11, 25, 1300, 1300, 10).encodeABI();
    expect(setCallAbi).toEqual('0x6444bd16000000000000000000000000000000000000000000000000000000000000000b000000000000000000000000000000000000000000000000000000000000001900000000000000000000000000000000000000000000000000000000000005140000000000000000000000000000000000000000000000000000000000000514000000000000000000000000000000000000000000000000000000000000000a');
    await sendEVMTxn(web3, alice, aggrFromProxyAddr, setCallAbi, 0, MinGasPrice, MaxGas);

    // Latest round data should match what was set in the last call
    latestRoundData = await aggrFromProxyContract.methods.latestRoundData().call();
    expect(latestRoundData['0']).toEqual('11');
    expect(latestRoundData['1']).toEqual('25');
    expect(latestRoundData['2']).toEqual('1300');
    expect(latestRoundData['3']).toEqual('1300');
    expect(latestRoundData['4']).toEqual('10');
    answer = await aggrFromProxyContract.methods.answer().call();
    expect(answer).toEqual('25');

    // Update round data again
    setCallAbi = aggrFromProxyContract.methods.setData(12, 30, 1400, 1400, 11).encodeABI();
    expect(setCallAbi).toEqual('0x6444bd16000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000000000000005780000000000000000000000000000000000000000000000000000000000000578000000000000000000000000000000000000000000000000000000000000000b');
    await sendEVMTxn(web3, alice, aggrFromProxyAddr, setCallAbi, 0, MinGasPrice, MaxGas);

    // Latest round data should match what was set in the last call
    latestRoundData = await aggrFromProxyContract.methods.latestRoundData().call();
    expect(latestRoundData['0']).toEqual('12');
    expect(latestRoundData['1']).toEqual('30');
    expect(latestRoundData['2']).toEqual('1400');
    expect(latestRoundData['3']).toEqual('1400');
    expect(latestRoundData['4']).toEqual('11');
    answer = await aggrFromProxyContract.methods.answer().call();
    expect(answer).toEqual('30');
  }, 40000);
});
