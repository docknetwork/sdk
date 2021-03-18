import { ethers, ContractFactory } from 'ethers';
import { endowEVMAddressWithDefault, getEthers, getTestEVMAccountsFromEthers} from './helpers';
import { ERC20_BYTECODE, ERC20_ABI } from './bytecodes-and-abis';

require('dotenv').config();

const { MinGasPrice, MaxGas } = process.env;

async function deploy(signer) {
  const factory = new ContractFactory(ERC20_ABI, ERC20_BYTECODE, signer);

  const supply = 100000;
  const contract = await factory.deploy(supply, {
    value: 0,
    gasPrice: MinGasPrice,
    gasLimit: MaxGas,
  });

  console.log(`Contract deployed at ${contract.address}`);
  return contract.address;
}

async function main() {
  // Deploy ERC-20 contract with ethers

  const provider = getEthers();

  const [alice, bob] = getTestEVMAccountsFromEthers(provider);
  await endowEVMAddressWithDefault(alice.address);
  await endowEVMAddressWithDefault(bob.address);

  const balance = await provider.getBalance(alice.address);
  console.log(`Alice's balance is ${balance}`);
  const contractAddr = await deploy(alice);

  const contract = new ethers.Contract(contractAddr, ERC20_ABI, provider);

  const receipt = await contract.connect(alice).transfer(bob.address, 5000, { gasLimit: GAS_LIMIT, gasPrice: GAS_PRICE, from: alice.address });
  console.log(`Txn hash is ${receipt.hash}`);
}

main().catch((err) => {
  console.log('Error', err);
});
