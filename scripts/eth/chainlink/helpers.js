import { getTokenBalance, sendEVMTxn, sendTokens } from '../helpers';
import { LinkTokenABI } from './bytecodes-and-abis';

export async function fund(web3, signer, linkTokenAddr, contractAddr, contract) {
  // Send Link to Aggregator
  console.log(`Aggregator's token balance: ${(await getTokenBalance(web3, linkTokenAddr, LinkTokenABI, contractAddr))}`);
  await sendTokens(web3, signer, linkTokenAddr, LinkTokenABI, contractAddr, web3.utils.toBN(1000000));
  console.log(`Aggregator's token balance: ${(await getTokenBalance(web3, linkTokenAddr, LinkTokenABI, contractAddr))}`);

  // Let Aggregator update its state to reflect the transferred ether
  const updateFundsCode = contract.methods.updateAvailableFunds().encodeABI();
  await sendEVMTxn(web3, signer, contractAddr, updateFundsCode);
}

export async function addOracles(web3, signer, contractAddr, contract, oracle1, oracle2) {
  // Add oracles
  // Keeping the admin same as oracle node as its an example

  const addOracle1Code = contract.methods.changeOracles([], [oracle1.address], [oracle1.address], 1, 1, 0).encodeABI();
  await sendEVMTxn(web3, signer, contractAddr, addOracle1Code);
  console.log(`Oracles: ${(await contract.methods.getOracles().call())}`);

  const addOracle2Code = contract.methods.changeOracles([], [oracle2.address], [oracle2.address], 1, 2, 0).encodeABI();
  await sendEVMTxn(web3, signer, contractAddr, addOracle2Code);
  console.log(`Oracles: ${(await contract.methods.getOracles().call())}`);
}
