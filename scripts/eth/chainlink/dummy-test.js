import Web3 from 'web3';
import {
  getTestEVMAccountsFromWeb3, endowEVMAddressWithDefault, sendEVMTxn, deployContract,
} from '../helpers';

require('dotenv').config();

const { FullNodeEndpoint } = process.env;

// Contract is DummyAggregator.sol
const Bytecode = '0x608060405234801561001057600080fd5b506040516102e73803806102e7833981810160405260a081101561003357600080fd5b5080516020820151604083015160608401516080909401519293919290919061006885858585856001600160e01b0361007216565b50505050506100af565b600080546001600160501b039687166001600160501b03199182161790915560019490945560029290925560035560048054919093169116179055565b610229806100be6000396000f3fe608060405234801561001057600080fd5b506004361061007d5760003560e01c80638cd221c91161005b5780638cd221c9146100e8578063c22c24991461010c578063f21f537d14610114578063feaf968c1461011c5761007d565b80636444bd16146100825780637519ab50146100c657806385bb7d69146100e0575b600080fd5b6100c4600480360360a081101561009857600080fd5b506001600160501b03813581169160208101359160408201359160608101359160809091013516610160565b005b6100ce6101a0565b60408051918252519081900360200190f35b6100ce6101a6565b6100f06101ac565b604080516001600160501b039092168252519081900360200190f35b6100f06101bb565b6100ce6101ca565b6101246101d0565b604080516001600160501b0396871681526020810195909552848101939093526060840191909152909216608082015290519081900360a00190f35b600080546001600160501b0396871669ffffffffffffffffffff199182161790915560019490945560029290925560035560048054919093169116179055565b60035481565b60015481565b6000546001600160501b031681565b6004546001600160501b031681565b60025481565b6000546001546002546003546004546001600160501b039485169416909192939456fea2646970667358221220739aa4f0c3ea9e475a476da24e7b66931c23a245f6542d41d7b936cd62e75e1264736f6c63430006050033';
const ABI = [
  {
    inputs: [
      {
        internalType: 'uint80',
        name: '_roundId',
        type: 'uint80',
      },
      {
        internalType: 'int256',
        name: '_answer',
        type: 'int256',
      },
      {
        internalType: 'uint256',
        name: '_startedAt',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_updatedAt',
        type: 'uint256',
      },
      {
        internalType: 'uint80',
        name: '_answeredInRound',
        type: 'uint80',
      },
    ],
    name: 'setData',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint80',
        name: '_roundId',
        type: 'uint80',
      },
      {
        internalType: 'int256',
        name: '_answer',
        type: 'int256',
      },
      {
        internalType: 'uint256',
        name: '_startedAt',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_updatedAt',
        type: 'uint256',
      },
      {
        internalType: 'uint80',
        name: '_answeredInRound',
        type: 'uint80',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [],
    name: 'answer',
    outputs: [
      {
        internalType: 'int256',
        name: '',
        type: 'int256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'answeredInRound',
    outputs: [
      {
        internalType: 'uint80',
        name: '',
        type: 'uint80',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      {
        internalType: 'uint80',
        name: '_roundId',
        type: 'uint80',
      },
      {
        internalType: 'int256',
        name: '_answer',
        type: 'int256',
      },
      {
        internalType: 'uint256',
        name: '_startedAt',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_updatedAt',
        type: 'uint256',
      },
      {
        internalType: 'uint80',
        name: '_answeredInRound',
        type: 'uint80',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'roundId',
    outputs: [
      {
        internalType: 'uint80',
        name: '',
        type: 'uint80',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'startedAt',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'updatedAt',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];
const ProxyBytecode = '0x608060405234801561001057600080fd5b506040516101493803806101498339818101604052602081101561003357600080fd5b5051600080546001600160a01b039092166001600160a01b031990921691909117905560e5806100646000396000f3fe6080604052348015600f57600080fd5b506004361060325760003560e01c8063245a7bfc146037578063f9120af6146059575b600080fd5b603d607e565b604080516001600160a01b039092168252519081900360200190f35b607c60048036036020811015606d57600080fd5b50356001600160a01b0316608d565b005b6000546001600160a01b031690565b600080546001600160a01b0319166001600160a01b039290921691909117905556fea2646970667358221220e6ea90ae509c1e97b506e2a0f0a3696b49e7b564a2723832159db0e2ec54c73564736f6c63430006050033';
const ProxyABI = [{
  inputs: [{
    internalType: "address",
    name: "_aggregator",
    type: "address"
  }],
  stateMutability: "nonpayable",
  type: "constructor"
}, {
  inputs: [],
  name: "aggregator",
  outputs: [{
    internalType: "address",
    name: "",
    type: "address"
  }],
  stateMutability: "view",
  type: "function"
}, {
  inputs: [{
    internalType: "address",
    name: "_aggregator",
    type: "address"
  }],
  name: "setAggregator",
  outputs: [],
  stateMutability: "nonpayable",
  type: "function"
}];

async function deploy(web3, signer) {
  const argsABI = web3.eth.abi.encodeParameters(['uint80', 'int256', 'uint256', 'uint256', 'uint80'], [10, 15, 1200, 1200, 10]);
  console.log(`Args abi is ${argsABI}`);
  // 0x000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000f00000000000000000000000000000000000000000000000000000000000004b000000000000000000000000000000000000000000000000000000000000004b0000000000000000000000000000000000000000000000000000000000000000a

  const contractBytecode = Bytecode + argsABI.slice(2);
  const address = await deployContract(web3, signer, contractBytecode);
  const proxyArgsABI = web3.eth.abi.encodeParameters(['address'], [address]).slice(2);
  console.log(`Proxy args abi is ${proxyArgsABI}`);
  // 0x000000000000000000000000a94b3cdd693618c05461ea661dbd0eee5280cae6
  return deployContract(web3, signer, ProxyBytecode + proxyArgsABI);
}

async function main() {
  const web3 = new Web3(FullNodeEndpoint);

  const [alice] = getTestEVMAccountsFromWeb3(web3);

  // Endow EVM address
  await endowEVMAddressWithDefault(alice.address);

  const proxyAddress = await deploy(web3, alice);

  // const proxyAddress = '0xE6A502736d19a6A0cF6Ce595956e1CEB2965Aa87';

  const proxyContract = new web3.eth.Contract(ProxyABI, proxyAddress);

  // Fetch current aggregator address from proxy
  const aggrFromProxyAddr = await proxyContract.methods.aggregator().call();
  const aggrFromProxyContract = new web3.eth.Contract(ABI, aggrFromProxyAddr);

  console.log((await aggrFromProxyContract.methods.latestRoundData().call()));
  console.log((await aggrFromProxyContract.methods.answer().call()));

  let setCallAbi = aggrFromProxyContract.methods.setData(11, 25, 1300, 1300, 10).encodeABI();
  console.log(setCallAbi);
  // 0x6444bd16000000000000000000000000000000000000000000000000000000000000000b000000000000000000000000000000000000000000000000000000000000001900000000000000000000000000000000000000000000000000000000000005140000000000000000000000000000000000000000000000000000000000000514000000000000000000000000000000000000000000000000000000000000000a
  await sendEVMTxn(web3, alice, aggrFromProxyAddr, setCallAbi);

  setCallAbi = aggrFromProxyContract.methods.setData(12, 30, 1400, 1400, 11).encodeABI();
  console.log(setCallAbi);
  // 0x6444bd16000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000000000000005780000000000000000000000000000000000000000000000000000000000000578000000000000000000000000000000000000000000000000000000000000000b
  await sendEVMTxn(web3, alice, aggrFromProxyAddr, setCallAbi);

  setCallAbi = aggrFromProxyContract.methods.setData(13, 40, 1410, 1400, 13).encodeABI();
  console.log(setCallAbi);
  // 0x6444bd16000000000000000000000000000000000000000000000000000000000000000d000000000000000000000000000000000000000000000000000000000000002800000000000000000000000000000000000000000000000000000000000005820000000000000000000000000000000000000000000000000000000000000578000000000000000000000000000000000000000000000000000000000000000d
  await sendEVMTxn(web3, alice, aggrFromProxyAddr, setCallAbi);

  const callAbi = aggrFromProxyContract.methods.latestRoundData().encodeABI();
  console.log(callAbi);
  // 0xfeaf968c

  console.log((await aggrFromProxyContract.methods.latestRoundData().call()));
  process.exit(0);
}

main().catch((err) => {
  console.log('Error', err);
});
