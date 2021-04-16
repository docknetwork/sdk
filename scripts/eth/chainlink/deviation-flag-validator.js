import {
  deployContract, getTestEVMAccountsFromWeb3, getWeb3, sendEVMTxn,
} from '../helpers';
import {
  WriteAccessControllerByteCode,
  WriteAccessControllerABI,
  FlagsByteCode,
  DeviationFlaggingValidatorByteCode,
} from './bytecodes-and-abis';

async function main() {
  const web3 = getWeb3();

  const [alice] = getTestEVMAccountsFromWeb3(web3);

  console.log('Deploying WriteAccessController contract to track who can raise flags');
  const wacAddr = await deployContract(web3, alice, WriteAccessControllerByteCode);
  const wacContract = new web3.eth.Contract(WriteAccessControllerABI, wacAddr);

  console.log('Deploying Flags contract which will allow validator to raise flags');
  const flagsInitBytecode = FlagsByteCode + web3.eth.abi.encodeParameters(['address'], [wacAddr]).slice(2);
  const flagsAddr = await deployContract(web3, alice, flagsInitBytecode);

  console.log('Deploying DeviationFlaggingValidator contract to raise a flag on deviation above threshold');
  // Setting the value of 100,000 is equivalent to tolerating a 100% change compared to the previous price.
  const flaggingThreshold = 10000; // 10%
  const validatorInitBytecode = DeviationFlaggingValidatorByteCode + web3.eth.abi.encodeParameters(['address', 'uint24'], [flagsAddr, flaggingThreshold]).slice(2);
  const validatorAddr = await deployContract(web3, alice, validatorInitBytecode);
  await sendEVMTxn(web3, alice, wacAddr, wacContract.methods.addAccess(validatorAddr).encodeABI());
}

main().catch((err) => {
  console.log('Error', err);
});
