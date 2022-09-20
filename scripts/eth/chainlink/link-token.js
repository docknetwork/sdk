import { LinkTokenABI, LinkTokenByteCode } from './bytecodes-and-abis';

import {
  deployContract, endowEVMAddressWithDefault,
  getTestEVMAccountsFromWeb3, getTokenBalance, getWeb3, sendTokens,
} from '../helpers';

async function main() {
  const web3 = getWeb3();

  const [alice, bob] = getTestEVMAccountsFromWeb3(web3);
  await endowEVMAddressWithDefault(alice.address);
  await endowEVMAddressWithDefault(bob.address);

  console.log(`Generated accounts ${alice.address}, ${bob.address}`);

  const decimals = web3.utils.toBN(18);
  const amount = web3.utils.toBN(100);
  const value = amount.mul(web3.utils.toBN(10).pow(decimals));

  console.log(`Alice's balance using web3 ${(await web3.eth.getBalance(alice.address))}`);

  const contractAddr = await deployContract(web3, alice, LinkTokenByteCode);

  console.log(`Alice's balance using web3 ${(await web3.eth.getBalance(alice.address))}`);
  console.log(`Alice's ERC-20 token balance ${(await getTokenBalance(web3, contractAddr, LinkTokenABI, alice.address))}`);
  console.log(`Bob's ERC-20 token balance ${(await getTokenBalance(web3, contractAddr, LinkTokenABI, bob.address))}`);

  const receipt = await sendTokens(web3, alice, contractAddr, LinkTokenABI, bob.address, value);
  console.log(receipt);

  console.log(`Alice's balance using web3 ${(await web3.eth.getBalance(alice.address))}`);
  console.log(`Alice's ERC-20 token balance ${(await getTokenBalance(web3, contractAddr, LinkTokenABI, alice.address))}`);
  console.log(`Bob's ERC-20 token balance ${(await getTokenBalance(web3, contractAddr, LinkTokenABI, bob.address))}`);
  process.exit(0);
}

main().catch((err) => {
  console.log('Error', err);
});
