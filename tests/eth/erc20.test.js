import { bnToBn } from '@polkadot/util';

import { ERC20_BYTECODE, ERC20_ABI } from '../../../scripts/eth/bytecodes-and-abis';
import {
  deployContract, endowEVMAddressWithDefault,
  getTestEVMAccountsFromWeb3, getTokenBalance, getWeb3, sendTokens,
} from '../../../scripts/eth/helpers';

import { FullNodeEndpoint, MinGasPrice, MaxGas } from '../../test-constants';
import { defaultEVMAccountEndowment } from '../helpers';

describe('Deploy an ERC-20 contract and transfer ERC-20 tokens', () => {
  let alice;
  let bob;
  const web3 = getWeb3(FullNodeEndpoint);

  beforeAll(async (done) => {
    const [a, b] = getTestEVMAccountsFromWeb3(web3);
    alice = a;
    bob = b;
    await endowEVMAddressWithDefault(alice.address, defaultEVMAccountEndowment());
    await endowEVMAddressWithDefault(bob.address, defaultEVMAccountEndowment());
    done();
  });

  afterAll(async () => {
    await web3.currentProvider.disconnect();
  }, 10000);

  test('Deploy contract and transfer tokens', async () => {
    const decimals = web3.utils.toBN(18);
    const supply = web3.utils.toBN(10000);
    const transferAmount = web3.utils.toBN(100);
    const supplyValue = supply.mul(web3.utils.toBN(10).pow(decimals));
    const transferValue = transferAmount.mul(web3.utils.toBN(10).pow(decimals));

    const aliceBal0 = await web3.eth.getBalance(alice.address);

    // Deploy contract
    const argsABI = web3.eth.abi.encodeParameters(['uint256'], [supplyValue]);
    const contractBytecode = ERC20_BYTECODE + argsABI.slice(2);
    const contractAddr = await deployContract(web3, alice, contractBytecode, 0, MinGasPrice, MaxGas);

    // Alice's balance should decrease due to contract deployment fees
    const aliceBal1 = await web3.eth.getBalance(alice.address);
    expect(bnToBn(aliceBal0).gt(bnToBn(aliceBal1))).toBeTruthy();

    const aliceErcBal0 = await getTokenBalance(web3, contractAddr, ERC20_ABI, alice.address);
    const bobErcBal0 = await getTokenBalance(web3, contractAddr, ERC20_ABI, bob.address);

    // Transfer ERC-20 tokens
    await sendTokens(web3, alice, contractAddr, ERC20_ABI, bob.address, transferValue, MinGasPrice, MaxGas);

    const aliceErcBal1 = await getTokenBalance(web3, contractAddr, ERC20_ABI, alice.address);
    const bobErcBal1 = await getTokenBalance(web3, contractAddr, ERC20_ABI, bob.address);

    // Bob's ERC-20 balance should increase
    expect(bnToBn(bobErcBal1).gt(bnToBn(bobErcBal0))).toBeTruthy();
    // Alice's ERC-20 balance should decrease
    expect(bnToBn(aliceErcBal0).gt(bnToBn(aliceErcBal1))).toBeTruthy();

    // Alice's balance should decrease due to token transfer fees
    const aliceBal2 = await web3.eth.getBalance(alice.address);
    expect(bnToBn(aliceBal1).gt(bnToBn(aliceBal2))).toBeTruthy();
  }, 20000);
});
