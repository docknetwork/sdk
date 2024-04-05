import { bnToBn } from '@polkadot/util';
import * as $ from 'parity-scale-codec';
import { DockAPI } from '../../../src/index';
import {
  PALLET_STORAGE_ACCESSOR_BYTECODE,
  PALLET_STORAGE_ACCESSOR_ABI,
  PALLET_STORAGE_ACCESSOR_DEPLOYED_BYTECODE,
} from '../../../scripts/eth/bytecodes-and-abis';
import {
  deployContract,
  endowEVMAddressWithDefault,
  getTestEVMAccountsFromWeb3,
  getWeb3,
} from '../../../scripts/eth/helpers';

import {
  TestKeyringOpts,
  FullNodeEndpoint,
  TestAccountURI,
  MinGasPrice,
  MaxGas,
  FullNodeTCPEndpoint,
} from '../../test-constants';
import { defaultEVMAccountEndowment } from '../helpers';

describe('Deploy a `PalletStorageAccessor` contract and read storage using its methods', () => {
  let alice;
  let bob;
  let contractAddress;
  const web3 = getWeb3(FullNodeTCPEndpoint);
  const dock = new DockAPI();

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    const [a, b] = getTestEVMAccountsFromWeb3(web3);
    alice = a;
    bob = b;
    await endowEVMAddressWithDefault(
      alice.address,
      defaultEVMAccountEndowment(),
      FullNodeEndpoint,
      TestAccountURI,
    );
    await endowEVMAddressWithDefault(
      bob.address,
      defaultEVMAccountEndowment(),
      FullNodeEndpoint,
      TestAccountURI,
    );
  });

  beforeAll(async () => {
    const aliceBal0 = await web3.eth.getBalance(alice.address);

    // Deploy contract
    const contractBytecode = PALLET_STORAGE_ACCESSOR_BYTECODE; // + argsABI.slice(2);
    contractAddress = await deployContract(
      web3,
      alice,
      contractBytecode,
      0,
      MinGasPrice,
      MaxGas,
    );

    // Alice's balance should decrease due to contract deployment fees
    const aliceBal1 = await web3.eth.getBalance(alice.address);
    expect(bnToBn(aliceBal0).gt(bnToBn(aliceBal1))).toBeTruthy();
  });

  afterAll(async () => {
    await web3.currentProvider.disconnect();
    await dock.disconnect();
  }, 1000);

  test('Should read a `Plain` value using `MetaStorageReader`', async () => {
    const contract = new web3.eth.Contract(
      PALLET_STORAGE_ACCESSOR_ABI,
      contractAddress,
    );

    const [{ 0: success, 1: rawData }, { block }] = await Promise.all([
      contract.methods
        .getStorage('System', 'Number', 0, '0x', '0x')
        .call(),
      dock.api.rpc.chain.getBlock(),
    ]);

    expect(success).toBe(true);
    const buffer = Buffer.from(rawData.slice(2), 'hex');
    const [found, ...data] = Array.from(buffer);
    const blockNumber = $.u32.decode(new Uint8Array(data)).toFixed();
    expect(!!found).toBe(true);
    expect(+blockNumber).toBe(+block.header.number);
  }, 2000);

  test('Should return correct output for non-existent value read using `MetaStorageReader`', async () => {
    const contract = new web3.eth.Contract(
      PALLET_STORAGE_ACCESSOR_ABI,
      contractAddress,
    );

    const { 0: success, 1: rawData } = await contract.methods
      .getStorage('A', 'Number', 1, contractAddress, '0x')
      .call();
    expect(success).toBe(false);
    expect(rawData).toBe(null);
  }, 2000);

  test('Should read value with offset using `MetaStorageReader`', async () => {
    const contract = new web3.eth.Contract(
      PALLET_STORAGE_ACCESSOR_ABI,
      contractAddress,
    );

    const { 0: success, 1: rawData } = await contract.methods
      .getStorageWithOffset(
        'EVM',
        'AccountCodes',
        1,
        contractAddress,
        '0x',
        100,
      )
      .call();

    expect(success).toBe(true);
    const buffer = Buffer.from(rawData.slice(2), 'hex');
    const [found, ...data] = Array.from(buffer);
    const code = Array.from(data);
    expect(!!found).toBe(true);
    expect(code).toEqual(
      Array.from(
        Buffer.from(PALLET_STORAGE_ACCESSOR_DEPLOYED_BYTECODE.slice(2), 'hex'),
      ).slice(98),
    );
  }, 2000);

  test('Should read value using `RawStorageReader`', async () => {
    const contract = new web3.eth.Contract(
      PALLET_STORAGE_ACCESSOR_ABI,
      contractAddress,
    );
    const key = new Uint8Array([
      38, 170, 57, 78, 234, 86, 48, 224, 124, 72, 174, 12, 149, 88, 206, 247, 2,
      165, 193, 177, 154, 183, 160, 79, 83, 108, 81, 154, 202, 73, 131, 172,
    ]);

    const [{ 0: success, 1: rawData }, { block }] = await Promise.all([
      contract.methods
        .getStorageRaw(key)
        .call(),
      dock.api.rpc.chain.getBlock(),
    ]);

    expect(success).toBe(true);
    const buffer = Buffer.from(rawData.slice(2), 'hex');
    const [found, ...data] = Array.from(buffer);
    const blockNumber = $.u32.decode(new Uint8Array(data)).toFixed();
    expect(!!found).toBe(true);
    expect(+blockNumber).toBe(+block.header.number);
  }, 2000);
});
