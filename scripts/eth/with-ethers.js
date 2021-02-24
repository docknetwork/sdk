import { ethers, ContractFactory } from 'ethers';
import { getEthers, getTestEVMAccountsFromEthers } from './helpers';
import { ERC20_BYTECODE, ERC20_ABI } from './bytecodes-and-abis';

const GAS_PRICE = 1;
const GAS_LIMIT = 2100000;

async function deploy(signer) {
  const factory = new ContractFactory(ERC20_ABI, ERC20_BYTECODE, signer);

  const contract = await factory.deploy({
    value: 0,
    gasPrice: GAS_PRICE,
    gasLimit: GAS_LIMIT,
  });

  console.log(`Contract deployed at ${contract.address}`);
  return contract.address;
}

async function main() {
  // Deploy ERC-20 contract with ethers

  const provider = getEthers();

  const [alice, bob] = getTestEVMAccountsFromEthers(provider);
  const balance = await provider.getBalance(alice.address);
  console.log(`Alice's balance is ${balance}`);
  const contractAddr = await deploy(alice);

  const contract = new ethers.Contract(contractAddr, ERC20_ABI, provider);
  console.log(`Balance of Alice ${(await contract.balanceOf(alice.address))}`);
  console.log(`Balance of Bob ${(await contract.balanceOf(bob.address))}`);

  const receipt = await contract.connect(alice).transfer(bob.address, 5000, { gasLimit: GAS_LIMIT, gasPrice: GAS_PRICE, from: alice.address });
  console.log(`Txn hash is ${receipt.hash}`);
  console.log(`Balance of Alice ${(await contract.balanceOf(alice.address))}`);
  console.log(`Balance of Bob ${(await contract.balanceOf(bob.address))}`);
}

main().catch((err) => {
  console.log('Error', err);
});
