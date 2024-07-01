// Contract is ERC20.sol
export const ERC20_BYTECODE = '0x608060405234801561001057600080fd5b5060405160208061064383398101604090815290516002819055336000908152602081905291909120556105fa806100496000396000f3006080604052600436106100985763ffffffff7c010000000000000000000000000000000000000000000000000000000060003504166306fdde03811461009d578063095ea7b31461012757806318160ddd1461015f57806323b872dd14610186578063313ce567146101b057806370a08231146101db57806395d89b41146101fc578063a9059cbb14610211578063dd62ed3e14610235575b600080fd5b3480156100a957600080fd5b506100b261025c565b6040805160208082528351818301528351919283929083019185019080838360005b838110156100ec5781810151838201526020016100d4565b50505050905090810190601f1680156101195780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b34801561013357600080fd5b5061014b600160a060020a0360043516602435610293565b604080519115158252519081900360200190f35b34801561016b57600080fd5b506101746102f9565b60408051918252519081900360200190f35b34801561019257600080fd5b5061014b600160a060020a03600435811690602435166044356102ff565b3480156101bc57600080fd5b506101c561045a565b6040805160ff9092168252519081900360200190f35b3480156101e757600080fd5b50610174600160a060020a036004351661045f565b34801561020857600080fd5b506100b261047a565b34801561021d57600080fd5b5061014b600160a060020a03600435166024356104b1565b34801561024157600080fd5b50610174600160a060020a036004358116906024351661057b565b60408051808201909152600a81527f4552433230426173696300000000000000000000000000000000000000000000602082015281565b336000818152600160209081526040808320600160a060020a038716808552908352818420869055815186815291519394909390927f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925928290030190a350600192915050565b60025490565b600160a060020a03831660009081526020819052604081205482111561032457600080fd5b600160a060020a038416600090815260016020908152604080832033845290915290205482111561035457600080fd5b600160a060020a03841660009081526020819052604090205461037d908363ffffffff6105a616565b600160a060020a0385166000908152602081815260408083209390935560018152828220338352905220546103b8908363ffffffff6105a616565b600160a060020a03808616600090815260016020908152604080832033845282528083209490945591861681529081905220546103fb908363ffffffff6105b816565b600160a060020a038085166000818152602081815260409182902094909455805186815290519193928816927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef92918290030190a35060019392505050565b601281565b600160a060020a031660009081526020819052604090205490565b60408051808201909152600381527f4253430000000000000000000000000000000000000000000000000000000000602082015281565b336000908152602081905260408120548211156104cd57600080fd5b336000908152602081905260409020546104ed908363ffffffff6105a616565b3360009081526020819052604080822092909255600160a060020a0385168152205461051f908363ffffffff6105b816565b600160a060020a038416600081815260208181526040918290209390935580518581529051919233927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9281900390910190a350600192915050565b600160a060020a03918216600090815260016020908152604080832093909416825291909152205490565b6000828211156105b257fe5b50900390565b6000828201838110156105c757fe5b93925050505600a165627a7a723058208b433dca186d93c36f5f1faf8177cf393794bf9a16db68df7d493e7ddb832c2b0029';
export const ERC20_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: 'delegate', type: 'address' },
      { name: 'numTokens', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'buyer', type: 'address' },
      { name: 'numTokens', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: 'tokenOwner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: 'receiver', type: 'address' },
      { name: 'numTokens', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'delegate', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'total', type: 'uint256' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tokenOwner', type: 'address' },
      { indexed: true, name: 'spender', type: 'address' },
      { indexed: false, name: 'tokens', type: 'uint256' },
    ],
    name: 'Approval',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'tokens', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  },
];

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

export const PALLET_STORAGE_ACCESSOR_ABI = [
  {
    inputs: [
      {
        internalType: 'bytes',
        name: 'key',
        type: 'bytes',
      },
    ],
    name: 'getStorageRaw',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
      {
        internalType: 'bytes',
        name: '',
        type: 'bytes',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'pallet',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'member',
        type: 'string',
      },
      {
        internalType: 'enum PalletStorageAccessor.KeyType',
        name: 'keyType',
        type: 'uint8',
      },
      {
        internalType: 'bytes',
        name: 'firstKey',
        type: 'bytes',
      },
      {
        internalType: 'bytes',
        name: 'secondKey',
        type: 'bytes',
      },
    ],
    name: 'getStorage',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
      {
        internalType: 'bytes',
        name: '',
        type: 'bytes',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'pallet',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'member',
        type: 'string',
      },
      {
        internalType: 'enum PalletStorageAccessor.KeyType',
        name: 'keyType',
        type: 'uint8',
      },
      {
        internalType: 'bytes',
        name: 'firstKey',
        type: 'bytes',
      },
      {
        internalType: 'bytes',
        name: 'secondKey',
        type: 'bytes',
      },
      {
        internalType: 'uint32',
        name: 'offset',
        type: 'uint32',
      },
    ],
    name: 'getStorageWithOffset',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
      {
        internalType: 'bytes',
        name: '',
        type: 'bytes',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'pallet',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'member',
        type: 'string',
      },
      {
        internalType: 'enum PalletStorageAccessor.KeyType',
        name: 'keyType',
        type: 'uint8',
      },
      {
        internalType: 'bytes',
        name: 'firstKey',
        type: 'bytes',
      },
      {
        internalType: 'bytes',
        name: 'secondKey',
        type: 'bytes',
      },
      {
        internalType: 'uint32',
        name: 'len',
        type: 'uint32',
      },
    ],
    name: 'getStorageWithLen',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
      {
        internalType: 'bytes',
        name: '',
        type: 'bytes',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'pallet',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'member',
        type: 'string',
      },
      {
        internalType: 'enum PalletStorageAccessor.KeyType',
        name: 'keyType',
        type: 'uint8',
      },
      {
        internalType: 'bytes',
        name: 'firstKey',
        type: 'bytes',
      },
      {
        internalType: 'bytes',
        name: 'secondKey',
        type: 'bytes',
      },
      {
        internalType: 'uint32',
        name: 'offset',
        type: 'uint32',
      },
      {
        internalType: 'uint32',
        name: 'len',
        type: 'uint32',
      },
    ],
    name: 'getStorageWithOffsetLen',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
      {
        internalType: 'bytes',
        name: '',
        type: 'bytes',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];
export const PALLET_STORAGE_ACCESSOR_BYTECODE = '0x608060405234801561001057600080fd5b50611643806100206000396000f3fe608060405234801561001057600080fd5b50600436106100575760003560e01c806341af69231461005c57806342c60d781461008d578063721b15c6146100be578063baa6a4e6146100ef578063f0f980ce14610120575b600080fd5b61007660048036038101906100719190610c64565b610151565b604051610084929190611367565b60405180910390f35b6100a760048036038101906100a29190610d4c565b6102b8565b6040516100b5929190611367565b60405180910390f35b6100d860048036038101906100d39190610c1f565b610430565b6040516100e6929190611367565b60405180910390f35b61010960048036038101906101049190610d4c565b6104df565b604051610117929190611367565b60405180910390f35b61013a60048036038101906101359190610e48565b610657565b604051610148929190611367565b60405180910390f35b600060606000600e9050600061016a89898989896107e0565b905060008d8d8080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f82011690508083019250505050505050905060008c8c8080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f8201169050808301925050505050505090508373ffffffffffffffffffffffffffffffffffffffff1661021f8351610a59565b8361022a8451610a59565b84876000604051602001610243969594939291906110f2565b60405160208183030381529060405260405161025f91906110a4565b6000604051808303816000865af19150503d806000811461029c576040519150601f19603f3d011682016040523d82523d6000602084013e6102a1565b606091505b509550955050505050995099975050505050505050565b600060606000600e905060006102d18a8a8a8a8a6107e0565b905060008e8e8080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f82011690508083019250505050505050905060008d8d8080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f8201169050808301925050505050505090508373ffffffffffffffffffffffffffffffffffffffff166103868351610a59565b836103918451610a59565b848760026103a48e63ffffffff16610a59565b6040516020016103ba979695949392919061114e565b6040516020818303038152906040526040516103d691906110a4565b6000604051808303816000865af19150503d8060008114610413576040519150601f19603f3d011682016040523d82523d6000602084013e610418565b606091505b5095509550505050509a509a98505050505050505050565b600060606000600f90508073ffffffffffffffffffffffffffffffffffffffff1661045d86869050610a59565b8686600060405160200161047494939291906110bb565b60405160208183030381529060405260405161049091906110a4565b6000604051808303816000865af19150503d80600081146104cd576040519150601f19603f3d011682016040523d82523d6000602084013e6104d2565b606091505b5092509250509250929050565b600060606000600e905060006104f88a8a8a8a8a6107e0565b905060008e8e8080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f82011690508083019250505050505050905060008d8d8080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f8201169050808301925050505050505090508373ffffffffffffffffffffffffffffffffffffffff166105ad8351610a59565b836105b88451610a59565b848760016105cb8e63ffffffff16610a59565b6040516020016105e1979695949392919061114e565b6040516020818303038152906040526040516105fd91906110a4565b6000604051808303816000865af19150503d806000811461063a576040519150601f19603f3d011682016040523d82523d6000602084013e61063f565b606091505b5095509550505050509a509a98505050505050505050565b600060606000600e905060006106708b8b8b8b8b6107e0565b905060008f8f8080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f82011690508083019250505050505050905060008e8e8080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f8201169050808301925050505050505090508373ffffffffffffffffffffffffffffffffffffffff166107258351610a59565b836107308451610a59565b848760036107438f63ffffffff16610a59565b6107528f63ffffffff16610a59565b6040516020016107699897969594939291906111b7565b60405160208183030381529060405260405161078591906110a4565b6000604051808303816000865af19150503d80600081146107c2576040519150601f19603f3d011682016040523d82523d6000602084013e6107c7565b606091505b5095509550505050509b509b9950505050505050505050565b6060806000600281111561081d577f4e487b7100000000000000000000000000000000000000000000000000000000600052602160045260246000fd5b876002811115610856577f4e487b7100000000000000000000000000000000000000000000000000000000600052602160045260246000fd5b141561090f578660405160200161086d919061122d565b6040516020818303038152906040529050600086869050146108c4576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016108bb906113b7565b60405180910390fd5b6000848490501461090a576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161090190611397565b60405180910390fd5b610a4c565b60016002811115610949577f4e487b7100000000000000000000000000000000000000000000000000000000600052602160045260246000fd5b876002811115610982577f4e487b7100000000000000000000000000000000000000000000000000000000600052602160045260246000fd5b1415610a06578661099587879050610a59565b87876040516020016109aa9493929190611248565b604051602081830303815290604052905060008484905014610a01576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016109f890611397565b60405180910390fd5b610a4b565b86610a1387879050610a59565b8787610a2188889050610a59565b8888604051602001610a39979695949392919061127f565b60405160208183030381529060405290505b5b8091505095945050505050565b60606040821015610a925760028260ff16901b604051602001610a7c91906112d2565b6040516020818303038152906040529050610b5c565b614000821015610ad357600160028360ff16901b17600683901c604051602001610abd9291906112ed565b6040516020818303038152906040529050610b5c565b6340000000821015610b21576002808360ff16901b17600683901c600e84901c601685901c604051602001610b0b9493929190611319565b6040516020818303038152906040529050610b5c565b6040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610b53906113d7565b60405180910390fd5b919050565b60008083601f840112610b7357600080fd5b8235905067ffffffffffffffff811115610b8c57600080fd5b602083019150836001820283011115610ba457600080fd5b9250929050565b600081359050610bba816115e6565b92915050565b60008083601f840112610bd257600080fd5b8235905067ffffffffffffffff811115610beb57600080fd5b602083019150836001820283011115610c0357600080fd5b9250929050565b600081359050610c19816115f6565b92915050565b60008060208385031215610c3257600080fd5b600083013567ffffffffffffffff811115610c4c57600080fd5b610c5885828601610b61565b92509250509250929050565b600080600080600080600080600060a08a8c031215610c8257600080fd5b60008a013567ffffffffffffffff811115610c9c57600080fd5b610ca88c828d01610bc0565b995099505060208a013567ffffffffffffffff811115610cc757600080fd5b610cd38c828d01610bc0565b97509750506040610ce68c828d01610bab565b95505060608a013567ffffffffffffffff811115610d0357600080fd5b610d0f8c828d01610b61565b945094505060808a013567ffffffffffffffff811115610d2e57600080fd5b610d3a8c828d01610b61565b92509250509295985092959850929598565b60008060008060008060008060008060c08b8d031215610d6b57600080fd5b60008b013567ffffffffffffffff811115610d8557600080fd5b610d918d828e01610bc0565b9a509a505060208b013567ffffffffffffffff811115610db057600080fd5b610dbc8d828e01610bc0565b98509850506040610dcf8d828e01610bab565b96505060608b013567ffffffffffffffff811115610dec57600080fd5b610df88d828e01610b61565b955095505060808b013567ffffffffffffffff811115610e1757600080fd5b610e238d828e01610b61565b935093505060a0610e368d828e01610c0a565b9150509295989b9194979a5092959850565b600080600080600080600080600080600060e08c8e031215610e6957600080fd5b60008c013567ffffffffffffffff811115610e8357600080fd5b610e8f8e828f01610bc0565b9b509b505060208c013567ffffffffffffffff811115610eae57600080fd5b610eba8e828f01610bc0565b99509950506040610ecd8e828f01610bab565b97505060608c013567ffffffffffffffff811115610eea57600080fd5b610ef68e828f01610b61565b965096505060808c013567ffffffffffffffff811115610f1557600080fd5b610f218e828f01610b61565b945094505060a0610f348e828f01610c0a565b92505060c0610f458e828f01610c0a565b9150509295989b509295989b9093969950565b610f618161142f565b82525050565b6000610f738385611413565b9350610f808385846114a2565b82840190509392505050565b6000610f97826113f7565b610fa18185611402565b9350610fb18185602086016114b1565b610fba81611525565b840191505092915050565b6000610fd0826113f7565b610fda8185611413565b9350610fea8185602086016114b1565b80840191505092915050565b6110076110028261147e565b6114e4565b82525050565b61101e61101982611490565b6114e4565b82525050565b600061103160188361141e565b915061103c82611543565b602082019050919050565b600061105460178361141e565b915061105f8261156c565b602082019050919050565b6000611077600d8361141e565b915061108282611595565b602082019050919050565b61109e61109982611471565b6114e4565b82525050565b60006110b08284610fc5565b915081905092915050565b60006110c78287610fc5565b91506110d4828587610f67565b91506110e0828461100d565b60018201915081905095945050505050565b60006110fe8289610fc5565b915061110a8288610fc5565b91506111168287610fc5565b91506111228286610fc5565b915061112e8285610fc5565b915061113a828461100d565b600182019150819050979650505050505050565b600061115a828a610fc5565b91506111668289610fc5565b91506111728288610fc5565b915061117e8287610fc5565b915061118a8286610fc5565b9150611196828561100d565b6001820191506111a68284610fc5565b915081905098975050505050505050565b60006111c3828b610fc5565b91506111cf828a610fc5565b91506111db8289610fc5565b91506111e78288610fc5565b91506111f38287610fc5565b91506111ff828661100d565b60018201915061120f8285610fc5565b915061121b8284610fc5565b91508190509998505050505050505050565b60006112398284610ff6565b60018201915081905092915050565b60006112548287610ff6565b6001820191506112648286610fc5565b9150611271828486610f67565b915081905095945050505050565b600061128b828a610ff6565b60018201915061129b8289610fc5565b91506112a8828789610f67565b91506112b48286610fc5565b91506112c1828486610f67565b915081905098975050505050505050565b60006112de828461108d565b60018201915081905092915050565b60006112f9828561108d565b600182019150611309828461108d565b6001820191508190509392505050565b6000611325828761108d565b600182019150611335828661108d565b600182019150611345828561108d565b600182019150611355828461108d565b60018201915081905095945050505050565b600060408201905061137c6000830185610f58565b818103602083015261138e8184610f8c565b90509392505050565b600060208201905081810360008301526113b081611024565b9050919050565b600060208201905081810360008301526113d081611047565b9050919050565b600060208201905081810360008301526113f08161106a565b9050919050565b600081519050919050565b600082825260208201905092915050565b600081905092915050565b600082825260208201905092915050565b60008115159050919050565b6000819050611449826115be565b919050565b600081905061145c826115d2565b919050565b600063ffffffff82169050919050565b600060ff82169050919050565b60006114898261143b565b9050919050565b600061149b8261144e565b9050919050565b82818337600083830152505050565b60005b838110156114cf5780820151818401526020810190506114b4565b838111156114de576000848401525b50505050565b60006114ef82611536565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602160045260246000fd5b6000601f19601f8301169050919050565b60008160f81b9050919050565b7f5365636f6e64206b6579206d75737420626520656d7074790000000000000000600082015250565b7f4669727374206b6579206d75737420626520656d707479000000000000000000600082015250565b7f556e696d706c656d656e74656400000000000000000000000000000000000000600082015250565b600381106115cf576115ce6114f6565b5b50565b600481106115e3576115e26114f6565b5b50565b600381106115f357600080fd5b50565b6115ff81611461565b811461160a57600080fd5b5056fea264697066735822122045902a2eca70e23c359f9ddaa922914d3d322f9636b96c5735a8d848a4fbb19264736f6c63430008020033';
export const PALLET_STORAGE_ACCESSOR_DEPLOYED_BYTECODE = '0x608060405234801561001057600080fd5b50600436106100575760003560e01c806341af69231461005c57806342c60d781461008d578063721b15c6146100be578063baa6a4e6146100ef578063f0f980ce14610120575b600080fd5b61007660048036038101906100719190610c64565b610151565b604051610084929190611367565b60405180910390f35b6100a760048036038101906100a29190610d4c565b6102b8565b6040516100b5929190611367565b60405180910390f35b6100d860048036038101906100d39190610c1f565b610430565b6040516100e6929190611367565b60405180910390f35b61010960048036038101906101049190610d4c565b6104df565b604051610117929190611367565b60405180910390f35b61013a60048036038101906101359190610e48565b610657565b604051610148929190611367565b60405180910390f35b600060606000600e9050600061016a89898989896107e0565b905060008d8d8080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f82011690508083019250505050505050905060008c8c8080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f8201169050808301925050505050505090508373ffffffffffffffffffffffffffffffffffffffff1661021f8351610a59565b8361022a8451610a59565b84876000604051602001610243969594939291906110f2565b60405160208183030381529060405260405161025f91906110a4565b6000604051808303816000865af19150503d806000811461029c576040519150601f19603f3d011682016040523d82523d6000602084013e6102a1565b606091505b509550955050505050995099975050505050505050565b600060606000600e905060006102d18a8a8a8a8a6107e0565b905060008e8e8080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f82011690508083019250505050505050905060008d8d8080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f8201169050808301925050505050505090508373ffffffffffffffffffffffffffffffffffffffff166103868351610a59565b836103918451610a59565b848760026103a48e63ffffffff16610a59565b6040516020016103ba979695949392919061114e565b6040516020818303038152906040526040516103d691906110a4565b6000604051808303816000865af19150503d8060008114610413576040519150601f19603f3d011682016040523d82523d6000602084013e610418565b606091505b5095509550505050509a509a98505050505050505050565b600060606000600f90508073ffffffffffffffffffffffffffffffffffffffff1661045d86869050610a59565b8686600060405160200161047494939291906110bb565b60405160208183030381529060405260405161049091906110a4565b6000604051808303816000865af19150503d80600081146104cd576040519150601f19603f3d011682016040523d82523d6000602084013e6104d2565b606091505b5092509250509250929050565b600060606000600e905060006104f88a8a8a8a8a6107e0565b905060008e8e8080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f82011690508083019250505050505050905060008d8d8080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f8201169050808301925050505050505090508373ffffffffffffffffffffffffffffffffffffffff166105ad8351610a59565b836105b88451610a59565b848760016105cb8e63ffffffff16610a59565b6040516020016105e1979695949392919061114e565b6040516020818303038152906040526040516105fd91906110a4565b6000604051808303816000865af19150503d806000811461063a576040519150601f19603f3d011682016040523d82523d6000602084013e61063f565b606091505b5095509550505050509a509a98505050505050505050565b600060606000600e905060006106708b8b8b8b8b6107e0565b905060008f8f8080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f82011690508083019250505050505050905060008e8e8080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f8201169050808301925050505050505090508373ffffffffffffffffffffffffffffffffffffffff166107258351610a59565b836107308451610a59565b848760036107438f63ffffffff16610a59565b6107528f63ffffffff16610a59565b6040516020016107699897969594939291906111b7565b60405160208183030381529060405260405161078591906110a4565b6000604051808303816000865af19150503d80600081146107c2576040519150601f19603f3d011682016040523d82523d6000602084013e6107c7565b606091505b5095509550505050509b509b9950505050505050505050565b6060806000600281111561081d577f4e487b7100000000000000000000000000000000000000000000000000000000600052602160045260246000fd5b876002811115610856577f4e487b7100000000000000000000000000000000000000000000000000000000600052602160045260246000fd5b141561090f578660405160200161086d919061122d565b6040516020818303038152906040529050600086869050146108c4576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016108bb906113b7565b60405180910390fd5b6000848490501461090a576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161090190611397565b60405180910390fd5b610a4c565b60016002811115610949577f4e487b7100000000000000000000000000000000000000000000000000000000600052602160045260246000fd5b876002811115610982577f4e487b7100000000000000000000000000000000000000000000000000000000600052602160045260246000fd5b1415610a06578661099587879050610a59565b87876040516020016109aa9493929190611248565b604051602081830303815290604052905060008484905014610a01576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016109f890611397565b60405180910390fd5b610a4b565b86610a1387879050610a59565b8787610a2188889050610a59565b8888604051602001610a39979695949392919061127f565b60405160208183030381529060405290505b5b8091505095945050505050565b60606040821015610a925760028260ff16901b604051602001610a7c91906112d2565b6040516020818303038152906040529050610b5c565b614000821015610ad357600160028360ff16901b17600683901c604051602001610abd9291906112ed565b6040516020818303038152906040529050610b5c565b6340000000821015610b21576002808360ff16901b17600683901c600e84901c601685901c604051602001610b0b9493929190611319565b6040516020818303038152906040529050610b5c565b6040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610b53906113d7565b60405180910390fd5b919050565b60008083601f840112610b7357600080fd5b8235905067ffffffffffffffff811115610b8c57600080fd5b602083019150836001820283011115610ba457600080fd5b9250929050565b600081359050610bba816115e6565b92915050565b60008083601f840112610bd257600080fd5b8235905067ffffffffffffffff811115610beb57600080fd5b602083019150836001820283011115610c0357600080fd5b9250929050565b600081359050610c19816115f6565b92915050565b60008060208385031215610c3257600080fd5b600083013567ffffffffffffffff811115610c4c57600080fd5b610c5885828601610b61565b92509250509250929050565b600080600080600080600080600060a08a8c031215610c8257600080fd5b60008a013567ffffffffffffffff811115610c9c57600080fd5b610ca88c828d01610bc0565b995099505060208a013567ffffffffffffffff811115610cc757600080fd5b610cd38c828d01610bc0565b97509750506040610ce68c828d01610bab565b95505060608a013567ffffffffffffffff811115610d0357600080fd5b610d0f8c828d01610b61565b945094505060808a013567ffffffffffffffff811115610d2e57600080fd5b610d3a8c828d01610b61565b92509250509295985092959850929598565b60008060008060008060008060008060c08b8d031215610d6b57600080fd5b60008b013567ffffffffffffffff811115610d8557600080fd5b610d918d828e01610bc0565b9a509a505060208b013567ffffffffffffffff811115610db057600080fd5b610dbc8d828e01610bc0565b98509850506040610dcf8d828e01610bab565b96505060608b013567ffffffffffffffff811115610dec57600080fd5b610df88d828e01610b61565b955095505060808b013567ffffffffffffffff811115610e1757600080fd5b610e238d828e01610b61565b935093505060a0610e368d828e01610c0a565b9150509295989b9194979a5092959850565b600080600080600080600080600080600060e08c8e031215610e6957600080fd5b60008c013567ffffffffffffffff811115610e8357600080fd5b610e8f8e828f01610bc0565b9b509b505060208c013567ffffffffffffffff811115610eae57600080fd5b610eba8e828f01610bc0565b99509950506040610ecd8e828f01610bab565b97505060608c013567ffffffffffffffff811115610eea57600080fd5b610ef68e828f01610b61565b965096505060808c013567ffffffffffffffff811115610f1557600080fd5b610f218e828f01610b61565b945094505060a0610f348e828f01610c0a565b92505060c0610f458e828f01610c0a565b9150509295989b509295989b9093969950565b610f618161142f565b82525050565b6000610f738385611413565b9350610f808385846114a2565b82840190509392505050565b6000610f97826113f7565b610fa18185611402565b9350610fb18185602086016114b1565b610fba81611525565b840191505092915050565b6000610fd0826113f7565b610fda8185611413565b9350610fea8185602086016114b1565b80840191505092915050565b6110076110028261147e565b6114e4565b82525050565b61101e61101982611490565b6114e4565b82525050565b600061103160188361141e565b915061103c82611543565b602082019050919050565b600061105460178361141e565b915061105f8261156c565b602082019050919050565b6000611077600d8361141e565b915061108282611595565b602082019050919050565b61109e61109982611471565b6114e4565b82525050565b60006110b08284610fc5565b915081905092915050565b60006110c78287610fc5565b91506110d4828587610f67565b91506110e0828461100d565b60018201915081905095945050505050565b60006110fe8289610fc5565b915061110a8288610fc5565b91506111168287610fc5565b91506111228286610fc5565b915061112e8285610fc5565b915061113a828461100d565b600182019150819050979650505050505050565b600061115a828a610fc5565b91506111668289610fc5565b91506111728288610fc5565b915061117e8287610fc5565b915061118a8286610fc5565b9150611196828561100d565b6001820191506111a68284610fc5565b915081905098975050505050505050565b60006111c3828b610fc5565b91506111cf828a610fc5565b91506111db8289610fc5565b91506111e78288610fc5565b91506111f38287610fc5565b91506111ff828661100d565b60018201915061120f8285610fc5565b915061121b8284610fc5565b91508190509998505050505050505050565b60006112398284610ff6565b60018201915081905092915050565b60006112548287610ff6565b6001820191506112648286610fc5565b9150611271828486610f67565b915081905095945050505050565b600061128b828a610ff6565b60018201915061129b8289610fc5565b91506112a8828789610f67565b91506112b48286610fc5565b91506112c1828486610f67565b915081905098975050505050505050565b60006112de828461108d565b60018201915081905092915050565b60006112f9828561108d565b600182019150611309828461108d565b6001820191508190509392505050565b6000611325828761108d565b600182019150611335828661108d565b600182019150611345828561108d565b600182019150611355828461108d565b60018201915081905095945050505050565b600060408201905061137c6000830185610f58565b818103602083015261138e8184610f8c565b90509392505050565b600060208201905081810360008301526113b081611024565b9050919050565b600060208201905081810360008301526113d081611047565b9050919050565b600060208201905081810360008301526113f08161106a565b9050919050565b600081519050919050565b600082825260208201905092915050565b600081905092915050565b600082825260208201905092915050565b60008115159050919050565b6000819050611449826115be565b919050565b600081905061145c826115d2565b919050565b600063ffffffff82169050919050565b600060ff82169050919050565b60006114898261143b565b9050919050565b600061149b8261144e565b9050919050565b82818337600083830152505050565b60005b838110156114cf5780820151818401526020810190506114b4565b838111156114de576000848401525b50505050565b60006114ef82611536565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602160045260246000fd5b6000601f19601f8301169050919050565b60008160f81b9050919050565b7f5365636f6e64206b6579206d75737420626520656d7074790000000000000000600082015250565b7f4669727374206b6579206d75737420626520656d707479000000000000000000600082015250565b7f556e696d706c656d656e74656400000000000000000000000000000000000000600082015250565b600381106115cf576115ce6114f6565b5b50565b600481106115e3576115e26114f6565b5b50565b600381106115f357600080fd5b50565b6115ff81611461565b811461160a57600080fd5b5056fea264697066735822122045902a2eca70e23c359f9ddaa922914d3d322f9636b96c5735a8d848a4fbb19264736f6c63430008020033';

// Contract is DummyAggregatorProxy
export const DUMMY_PROXY_BYTECODE = '0x608060405234801561001057600080fd5b506040516101493803806101498339818101604052602081101561003357600080fd5b5051600080546001600160a01b039092166001600160a01b031990921691909117905560e5806100646000396000f3fe6080604052348015600f57600080fd5b506004361060325760003560e01c8063245a7bfc146037578063f9120af6146059575b600080fd5b603d607e565b604080516001600160a01b039092168252519081900360200190f35b607c60048036036020811015606d57600080fd5b50356001600160a01b0316608d565b005b6000546001600160a01b031690565b600080546001600160a01b0319166001600160a01b039290921691909117905556fea2646970667358221220e6ea90ae509c1e97b506e2a0f0a3696b49e7b564a2723832159db0e2ec54c73564736f6c63430006050033';
export const DUMMY_PROXY_ABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: '_aggregator',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [],
    name: 'aggregator',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_aggregator',
        type: 'address',
      },
    ],
    name: 'setAggregator',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];
