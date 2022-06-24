// Contract is ERC20.sol
export const ERC20_BYTECODE = '0x608060405234801561001057600080fd5b5060405160208061064383398101604090815290516002819055336000908152602081905291909120556105fa806100496000396000f3006080604052600436106100985763ffffffff7c010000000000000000000000000000000000000000000000000000000060003504166306fdde03811461009d578063095ea7b31461012757806318160ddd1461015f57806323b872dd14610186578063313ce567146101b057806370a08231146101db57806395d89b41146101fc578063a9059cbb14610211578063dd62ed3e14610235575b600080fd5b3480156100a957600080fd5b506100b261025c565b6040805160208082528351818301528351919283929083019185019080838360005b838110156100ec5781810151838201526020016100d4565b50505050905090810190601f1680156101195780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b34801561013357600080fd5b5061014b600160a060020a0360043516602435610293565b604080519115158252519081900360200190f35b34801561016b57600080fd5b506101746102f9565b60408051918252519081900360200190f35b34801561019257600080fd5b5061014b600160a060020a03600435811690602435166044356102ff565b3480156101bc57600080fd5b506101c561045a565b6040805160ff9092168252519081900360200190f35b3480156101e757600080fd5b50610174600160a060020a036004351661045f565b34801561020857600080fd5b506100b261047a565b34801561021d57600080fd5b5061014b600160a060020a03600435166024356104b1565b34801561024157600080fd5b50610174600160a060020a036004358116906024351661057b565b60408051808201909152600a81527f4552433230426173696300000000000000000000000000000000000000000000602082015281565b336000818152600160209081526040808320600160a060020a038716808552908352818420869055815186815291519394909390927f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925928290030190a350600192915050565b60025490565b600160a060020a03831660009081526020819052604081205482111561032457600080fd5b600160a060020a038416600090815260016020908152604080832033845290915290205482111561035457600080fd5b600160a060020a03841660009081526020819052604090205461037d908363ffffffff6105a616565b600160a060020a0385166000908152602081815260408083209390935560018152828220338352905220546103b8908363ffffffff6105a616565b600160a060020a03808616600090815260016020908152604080832033845282528083209490945591861681529081905220546103fb908363ffffffff6105b816565b600160a060020a038085166000818152602081815260409182902094909455805186815290519193928816927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef92918290030190a35060019392505050565b601281565b600160a060020a031660009081526020819052604090205490565b60408051808201909152600381527f4253430000000000000000000000000000000000000000000000000000000000602082015281565b336000908152602081905260408120548211156104cd57600080fd5b336000908152602081905260409020546104ed908363ffffffff6105a616565b3360009081526020819052604080822092909255600160a060020a0385168152205461051f908363ffffffff6105b816565b600160a060020a038416600081815260208181526040918290209390935580518581529051919233927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9281900390910190a350600192915050565b600160a060020a03918216600090815260016020908152604080832093909416825291909152205490565b6000828211156105b257fe5b50900390565b6000828201838110156105c757fe5b93925050505600a165627a7a723058208b433dca186d93c36f5f1faf8177cf393794bf9a16db68df7d493e7ddb832c2b0029';
export const ERC20_ABI = [{
  constant: true, inputs: [], name: 'name', outputs: [{ name: '', type: 'string' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: false, inputs: [{ name: 'delegate', type: 'address' }, { name: 'numTokens', type: 'uint256' }], name: 'approve', outputs: [{ name: '', type: 'bool' }], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: true, inputs: [], name: 'totalSupply', outputs: [{ name: '', type: 'uint256' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: false, inputs: [{ name: 'owner', type: 'address' }, { name: 'buyer', type: 'address' }, { name: 'numTokens', type: 'uint256' }], name: 'transferFrom', outputs: [{ name: '', type: 'bool' }], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: true, inputs: [], name: 'decimals', outputs: [{ name: '', type: 'uint8' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: true, inputs: [{ name: 'tokenOwner', type: 'address' }], name: 'balanceOf', outputs: [{ name: '', type: 'uint256' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: true, inputs: [], name: 'symbol', outputs: [{ name: '', type: 'string' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: false, inputs: [{ name: 'receiver', type: 'address' }, { name: 'numTokens', type: 'uint256' }], name: 'transfer', outputs: [{ name: '', type: 'bool' }], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: true, inputs: [{ name: 'owner', type: 'address' }, { name: 'delegate', type: 'address' }], name: 'allowance', outputs: [{ name: '', type: 'uint256' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  inputs: [{ name: 'total', type: 'uint256' }], payable: false, stateMutability: 'nonpayable', type: 'constructor',
}, {
  anonymous: false, inputs: [{ indexed: true, name: 'tokenOwner', type: 'address' }, { indexed: true, name: 'spender', type: 'address' }, { indexed: false, name: 'tokens', type: 'uint256' }], name: 'Approval', type: 'event',
}, {
  anonymous: false, inputs: [{ indexed: true, name: 'from', type: 'address' }, { indexed: true, name: 'to', type: 'address' }, { indexed: false, name: 'tokens', type: 'uint256' }], name: 'Transfer', type: 'event',
}];

// Contract is DummyAggregator
export const DUMMY_AGGREGATOR_BYTECODE = '0x608060405234801561001057600080fd5b506040516102e73803806102e7833981810160405260a081101561003357600080fd5b5080516020820151604083015160608401516080909401519293919290919061006885858585856001600160e01b0361007216565b50505050506100af565b600080546001600160501b039687166001600160501b03199182161790915560019490945560029290925560035560048054919093169116179055565b610229806100be6000396000f3fe608060405234801561001057600080fd5b506004361061007d5760003560e01c80638cd221c91161005b5780638cd221c9146100e8578063c22c24991461010c578063f21f537d14610114578063feaf968c1461011c5761007d565b80636444bd16146100825780637519ab50146100c657806385bb7d69146100e0575b600080fd5b6100c4600480360360a081101561009857600080fd5b506001600160501b03813581169160208101359160408201359160608101359160809091013516610160565b005b6100ce6101a0565b60408051918252519081900360200190f35b6100ce6101a6565b6100f06101ac565b604080516001600160501b039092168252519081900360200190f35b6100f06101bb565b6100ce6101ca565b6101246101d0565b604080516001600160501b0396871681526020810195909552848101939093526060840191909152909216608082015290519081900360a00190f35b600080546001600160501b0396871669ffffffffffffffffffff199182161790915560019490945560029290925560035560048054919093169116179055565b60035481565b60015481565b6000546001600160501b031681565b6004546001600160501b031681565b60025481565b6000546001546002546003546004546001600160501b039485169416909192939456fea2646970667358221220739aa4f0c3ea9e475a476da24e7b66931c23a245f6542d41d7b936cd62e75e1264736f6c63430006050033';
export const DUMMY_AGGREGATOR_ABI = [
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

// Contract is DummyAggregatorProxy
export const DUMMY_PROXY_BYTECODE = '0x608060405234801561001057600080fd5b506040516101493803806101498339818101604052602081101561003357600080fd5b5051600080546001600160a01b039092166001600160a01b031990921691909117905560e5806100646000396000f3fe6080604052348015600f57600080fd5b506004361060325760003560e01c8063245a7bfc146037578063f9120af6146059575b600080fd5b603d607e565b604080516001600160a01b039092168252519081900360200190f35b607c60048036036020811015606d57600080fd5b50356001600160a01b0316608d565b005b6000546001600160a01b031690565b600080546001600160a01b0319166001600160a01b039290921691909117905556fea2646970667358221220e6ea90ae509c1e97b506e2a0f0a3696b49e7b564a2723832159db0e2ec54c73564736f6c63430006050033';
export const DUMMY_PROXY_ABI = [{
  inputs: [{
    internalType: 'address',
    name: '_aggregator',
    type: 'address',
  }],
  stateMutability: 'nonpayable',
  type: 'constructor',
}, {
  inputs: [],
  name: 'aggregator',
  outputs: [{
    internalType: 'address',
    name: '',
    type: 'address',
  }],
  stateMutability: 'view',
  type: 'function',
}, {
  inputs: [{
    internalType: 'address',
    name: '_aggregator',
    type: 'address',
  }],
  name: 'setAggregator',
  outputs: [],
  stateMutability: 'nonpayable',
  type: 'function',
}];
