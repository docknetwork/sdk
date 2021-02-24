// Script used by an Oracle to deploy its contract.

import { OracleABI, OracleByteCode } from './bytecodes-and-abis';

import { deployContract, getTestEVMAccountsFromWeb3, getWeb3 } from '../helpers';

async function main() {
  const web3 = getWeb3();

  const [, bob] = getTestEVMAccountsFromWeb3(web3);

  // Assumes Link token is deployed and address is known.
  const linkTokenAddr = '0xEF681D401f60FCBBb5BB32edbcA72a85dD2b7bff';

  // Oracle contract takes Link token address as constructor argument.
  const argsABI = web3.eth.abi.encodeParameters(['address'], [linkTokenAddr]);
  const contractBytecode = OracleByteCode + argsABI.slice(2);

  const contractAddr = await deployContract(web3, bob, contractBytecode);

  const contract = new web3.eth.Contract(OracleABI, contractAddr);
  console.log((await contract.methods.getChainlinkToken().call()));
}

main().catch((err) => {
  console.log('Error', err);
});
