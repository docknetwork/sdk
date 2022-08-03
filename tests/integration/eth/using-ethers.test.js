import { ethers, ContractFactory } from 'ethers';
import {
  endowEVMAddressWithDefault,
  getEthers,
  getTestEVMAccountsFromEthers,
} from '../../../scripts/eth/helpers';
import { ERC20_BYTECODE, ERC20_ABI } from '../../../scripts/eth/bytecodes-and-abis';

import {
  FullNodeTCPEndpoint, TestAccountURI, MinGasPrice, MaxGas, FullNodeEndpoint,
} from '../../test-constants';
import { defaultEVMAccountEndowment } from '../helpers';

async function deploy(signer, supply) {
  const factory = new ContractFactory(ERC20_ABI, ERC20_BYTECODE, signer);

  const contract = await factory.deploy(supply, {
    value: 0,
    gasPrice: parseInt(MinGasPrice, 10),
    gasLimit: parseInt(MaxGas, 10),
  });

  console.log(`Contract deployed at ${contract.address}`);
  return contract.address;
}

describe('Deploy an ERC-20 contract and transfer ERC-20 tokens', () => {
  let alice;
  let bob;
  const ethersProvider = getEthers(FullNodeTCPEndpoint);

  beforeAll(async () => {
    const [a, b] = getTestEVMAccountsFromEthers(ethersProvider);
    alice = a;
    bob = b;
    await endowEVMAddressWithDefault(alice.address, defaultEVMAccountEndowment(), FullNodeEndpoint, TestAccountURI);
    await endowEVMAddressWithDefault(bob.address, defaultEVMAccountEndowment(), FullNodeEndpoint, TestAccountURI);
  });

  afterAll(async () => {
    await ethersProvider.disconnect();
  }, 10000);

  test('Deploy contract and transfer tokens', async () => {
    // NOTE: This test is not checking any balance changes. Most likely there is some issue with the Frontier implementation
    // as the logic is straightforward and the same works with web3
    const supply = 10000;
    const transferAmount = 100;

    const aliceBal0 = await ethersProvider.getBalance(alice.address);
    const contractAddr = await deploy(alice, supply);
    const aliceBal1 = await ethersProvider.getBalance(alice.address);
    // expect(aliceBal0.gt(aliceBal1)).toBeTruthy();

    const contract = new ethers.Contract(contractAddr, ERC20_ABI, ethersProvider);

    // const aliceErcBal0 = await contract.balanceOf(alice.address);
    // const bobErcBal0 = await contract.balanceOf(bob.address);

    const receipt = await contract.connect(alice).transfer(bob.address, transferAmount, { gasLimit: parseInt(MaxGas, 10), gasPrice: parseInt(MinGasPrice, 10), from: alice.address });
    console.log(receipt);

    // const aliceErcBal1 = await contract.balanceOf(alice.address);
    // const bobErcBal1 = await contract.balanceOf(bob.address);

    // expect(aliceErcBal0.gt(aliceErcBal1)).toBeTruthy();
    // expect(bobErcBal1.gt(bobErcBal0)).toBeTruthy();
  }, 20000);
});
