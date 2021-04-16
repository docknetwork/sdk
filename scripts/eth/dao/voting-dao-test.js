import {
  KernelBytecode, KernelABI, ACLBytecode, ACLABI, EVMScriptRegistryFactoryBytecode, DAOFactoryBytecode, DAOFactoryABI, VotingDAOABI, VotingDAOBytecode, MiniMeTokenABI, MiniMeTokenBytecode, CounterABI, CounterBytecode,
} from './bytecodes-and-abis';

import {
  getTestEVMAccountsFromWeb3, endowEVMAddressWithDefault, sendEVMTxn, deployContract, getWeb3,
} from '../helpers';

require('dotenv').config();

async function createDaoFactory(web3, signer) {
  const kernelContractAddr = await deployContract(web3, signer, KernelBytecode + web3.eth.abi.encodeParameters(['bool'], [true]).slice(2));
  const aclContractAddr = await deployContract(web3, signer, ACLBytecode);
  const evmRegContractAddr = await deployContract(web3, signer, EVMScriptRegistryFactoryBytecode);
  const daoFactContractAddr = await deployContract(web3, signer, DAOFactoryBytecode + web3.eth.abi.encodeParameters(['address', 'address', 'address'], [kernelContractAddr, aclContractAddr, evmRegContractAddr]).slice(2));
  console.log(`Creating Kernel ${kernelContractAddr}, ACL ${aclContractAddr}, EVM Script registry ${evmRegContractAddr} and DAO factory ${daoFactContractAddr}`);
  return [kernelContractAddr, aclContractAddr, evmRegContractAddr, daoFactContractAddr];
}

async function createNewDao(web3, signer, root, daoFactAddr) {
  const daoFactContract = new web3.eth.Contract(DAOFactoryABI, daoFactAddr);
  const receipt = await sendEVMTxn(web3, signer, daoFactAddr, daoFactContract.methods.newDAO(root).encodeABI());
  // The last log contains the address of the DAO
  const decoded = web3.eth.abi.decodeLog([{ type: 'address', name: 'dao' }], receipt.logs[receipt.logs.length - 1].data);
  console.log(`Created new DAO ${decoded.dao} from factory`);
  return decoded.dao;
}

async function setupAcl(web3, signer, root, daoAddr) {
  console.log(`Setting ${root} as the manager of the kernel`);
  const dao = new web3.eth.Contract(KernelABI, daoAddr);
  const aclAddr = await dao.methods.acl().call();
  const acl = new web3.eth.Contract(ACLABI, aclAddr);
  const managerRole = await dao.methods.APP_MANAGER_ROLE().call();
  await sendEVMTxn(web3, signer, acl.options.address, acl.methods.createPermission(root, dao.options.address, managerRole, root).encodeABI());
  console.log(`Kernel ACL is ${aclAddr}`);
  return aclAddr;
}

async function setupVotingApp(web3, signer, root, appId, daoAddr, aclAddr) {
  console.log('Install voting app and permit anyone with tokens to vote');
  const dao = new web3.eth.Contract(KernelABI, daoAddr);
  const acl = new web3.eth.Contract(ACLABI, aclAddr);

  // Pattern to keep the contract upgradable.
  const votingBaseAddress = await deployContract(web3, signer, VotingDAOBytecode);
  const votingBase = new web3.eth.Contract(VotingDAOABI, votingBaseAddress);
  const receipt = await sendEVMTxn(web3, signer, dao.options.address, dao.methods.newAppInstance(appId, votingBaseAddress).encodeABI());
  // The last log contains the address of the voting app
  const decoded = web3.eth.abi.decodeLog([{ type: 'address', name: 'proxy' }], receipt.logs[receipt.logs.length - 1].data);
  const votingAppAddress = decoded.proxy;
  console.log(`Installed voting app at ${votingAppAddress}`);

  const anyOne = '0xffffffffffffffffffffffffffffffffffffffff'; // Granting permission to this special address means everyone has this permission
  await sendEVMTxn(web3, signer, acl.options.address, acl.methods.createPermission(anyOne, votingAppAddress, (await votingBase.methods.CREATE_VOTES_ROLE().call()), root).encodeABI());
  return votingAppAddress;
}

async function deployToken(web3, signer, voters) {
  const zeroAddress = `0x${'0'.repeat(40)}`; // 0x0000...0000
  console.log('Deploying MiniMeToken token and giving tokens to holders to vote with');
  const tokenArgsABI = web3.eth.abi.encodeParameters(['address', 'address', 'uint', 'string', 'uint8', 'string', 'bool'], [zeroAddress, zeroAddress, 0, 'MiniMeToken', 0, 'mm', true]);
  const tokenContractBytecode = MiniMeTokenBytecode + tokenArgsABI.slice(2);
  const tokenContractAddr = await deployContract(web3, signer, tokenContractBytecode);
  const tokenContract = new web3.eth.Contract(MiniMeTokenABI, tokenContractAddr);

  /* eslint-disable no-await-in-loop */
  for (let i = 0; i < voters.length; i++) {
    const [address, amount] = voters[i];
    await sendEVMTxn(web3, signer, tokenContractAddr, tokenContract.methods.generateTokens(address, amount).encodeABI());
  }

  console.log(`Token deployed at ${tokenContractAddr}`);
  return tokenContractAddr;
}

async function initializeVotingApp(web3, signer, votingAppAddress, tokenContractAddr) {
  console.log('Initializing voting app with token');

  const votingApp = new web3.eth.Contract(VotingDAOABI, votingAppAddress);
  const ten16 = web3.utils.toBN(10).pow(web3.utils.toBN(16)); // 10^16

  // Acceptance requires >50% and participation of >20% and voting lasts for 30 seconds. These values are just an example.
  const supportRequiredPct = web3.utils.toBN(50).mul(ten16);
  const minAcceptQuorumPct = web3.utils.toBN(20).mul(ten16);
  const votingDuration = 30;

  await sendEVMTxn(web3, signer, votingAppAddress, votingApp.methods.initialize(tokenContractAddr, supportRequiredPct, minAcceptQuorumPct, votingDuration).encodeABI());
}

async function setupVotingExecutor(web3, signer) {
  console.log('Setting up Counter contract whose methods will be called through voting');

  const counterAddr = await deployContract(web3, signer, CounterBytecode);
  const counterContract = new web3.eth.Contract(CounterABI, counterAddr);

  const incrementCall = counterContract.methods.increment().encodeABI().slice(2);
  const decrementCall = counterContract.methods.decrement().encodeABI().slice(2);

  // Aragon specific encoding of the `increment` and `decrement` methods of the Counter.
  // [1 byte identifier] + [ 20 bytes (address) ] + [ 4 bytes (uint32: calldata length) ] + [ calldataLength bytes (payload) ]
  function encode(calldata) {
    return `0x00000001${
      web3.eth.abi.encodeParameter('address', counterAddr).slice(26) // Remove leading 0x and 12 more bytes
    }${web3.eth.abi.encodeParameter('uint256', calldata.length / 2).slice(58) // Remove leading 0x and 28 more bytes
    }${calldata}`;
  }

  // Encoded actions that will be executed on successful voting
  const incrementScript = encode(incrementCall);
  const decrementScript = encode(decrementCall);

  console.log(`Counter deployed at ${counterAddr}, incrementer script is ${incrementScript}, decrementer script is ${decrementScript}`);

  return [counterAddr, incrementScript, decrementScript];
}

async function createNewVote(web3, signer, votingAppAddress, execScript) {
  const votingApp = new web3.eth.Contract(VotingDAOABI, votingAppAddress);
  // vote
  const receipt = await sendEVMTxn(web3, signer, votingAppAddress, votingApp.methods.newVote(execScript, '').encodeABI());

  // Extract `voteId` from the first log
  const decodedLog = web3.eth.abi.decodeLog([{ type: 'uint256', name: 'voteId', indexed: true }, { type: 'address', name: 'creator', indexed: true }, { type: 'string', name: 'metadata' }], receipt.logs[0].data, [receipt.logs[0].topics[1], receipt.logs[0].topics[2]]);
  console.log(`Created a new vote with id: ${decodedLog.voteId}`);
  return decodedLog.voteId;
}

async function getCounter(web3, counterAddr) {
  const counterContract = new web3.eth.Contract(CounterABI, counterAddr);
  return counterContract.methods.counter().call();
}

async function main() {
  const web3 = getWeb3();

  // Create some test accounts. Alice will be the manager of the DAO while Bob, Carol and Dave will be voters.
  const [alice, bob, carol, dave] = getTestEVMAccountsFromWeb3(web3);

  // Endow accounts with tokens so they can pay fees for transactions
  await endowEVMAddressWithDefault(alice.address);
  await endowEVMAddressWithDefault(bob.address);
  await endowEVMAddressWithDefault(carol.address);
  await endowEVMAddressWithDefault(dave.address);

  // Create a contract factory to create new DAO instance.
  const [, , , daoFactContractAddr] = await createDaoFactory(web3, alice);

  // Create a new DAO instance
  const daoAddr = await createNewDao(web3, alice, alice.address, daoFactContractAddr);

  // Set access control and set Alice as DAO's manager
  const aclAddr = await setupAcl(web3, alice, alice.address, daoAddr);

  // Some unique app id
  const appId = '0x0000000000000000000000000000000000000000000000000000000000000100';

  // Create a voting contract, install it as an app in the DAO and allow any token holder to vote
  const votingAppAddress = await setupVotingApp(web3, alice, alice.address, appId, daoAddr, aclAddr);
  const votingApp = new web3.eth.Contract(VotingDAOABI, votingAppAddress);

  // Deploy a token contract where Bob, Carol and Dave will have 51%, 29% and 20% tokens as thus proportional voting power.
  const tokenContractAddr = await deployToken(web3, alice, [[bob.address, 51], [carol.address, 29], [dave.address, 20]]);

  // Initialize the voting by supplying the token contract and thresholds for voting.
  await initializeVotingApp(web3, alice, votingAppAddress, tokenContractAddr);

  // A Counter contract as an example executor. In practice, the executor methods will only allow calls by the voting contract.
  const [counterAddr, incrementScript] = await setupVotingExecutor(web3, alice);

  // Bob alone can increment the Counter as he has 51% tokens
  console.log(`Counter before increment from Bob ${(await getCounter(web3, counterAddr))}`);
  await sendEVMTxn(web3, bob, votingAppAddress, votingApp.methods.newVote(incrementScript, '').encodeABI());
  console.log(`Counter after increment from Bob ${(await getCounter(web3, counterAddr))}`);

  // Carol creates a new vote
  const voteId = await createNewVote(web3, carol, votingAppAddress, incrementScript);
  // Dave seconds Carol's vote
  await sendEVMTxn(web3, dave, votingAppAddress, votingApp.methods.vote(voteId, true, true).encodeABI());
  console.log("Counter after attempted increment from Carol and Dave. Counter will not change as Bob and Carol don't have enough voting power");

  process.exit(0);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
