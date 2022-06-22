import { bnToBn } from '@polkadot/util';
import {
  getTestEVMAccountsFromWeb3, getWeb3, sendTokensToEVMAddress,
} from '../../../scripts/eth/helpers';

import { DockAPI } from '../../../src/index';

import { getBalance } from '../../../src/utils/chain-ops';
import {
  endowEVMAddress,
  evmAddrToSubstrateAddr, substrateAddrToEVMAddr,
} from '../../../src/utils/evm-utils';

import {
  FullNodeEndpoint, TestKeyringOpts, TestAccountURI, MinGasPrice, MaxGas, FullNodeTCPEndpoint,
} from '../../test-constants';
import { defaultEVMAccountEndowment } from '../helpers';

describe('Transfer native Dock tokens to an EVM account and withdraw it back to native account', () => {
  const dock = new DockAPI();
  const web3 = getWeb3(FullNodeTCPEndpoint);
  let carol;
  let jacob;
  // 100 tokens
  const transferAmount = 100000000;

  beforeAll(async (done) => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    // Create a EVM account Carol
    const [, , c] = getTestEVMAccountsFromWeb3(web3);
    carol = c;
    jacob = dock.keyring.addFromUri(TestAccountURI);
    done();
  });

  afterAll(async () => {
    await dock.disconnect();
    await web3.currentProvider.disconnect();
  }, 10000);

  test('Send native tokens to EVM address', async () => {
    // Jacob has Dock tokens and will send tokens to Carol.

    // Carol's native address
    const carolSubsAddr = evmAddrToSubstrateAddr(carol.address);

    const carolNatBal0 = await getBalance(dock.api, carolSubsAddr, false);
    const carolWeb3Bal0 = await web3.eth.getBalance(carol.address);
    console.log(`Balance of Carol's address using web3: ${carolWeb3Bal0}`);
    console.log(`Balance of Carol's address using polkadot-js: ${carolNatBal0}`);
    expect(carolNatBal0).toEqual(+carolWeb3Bal0 + (+carolNatBal0 !== 0 && 500));

    // Setup Jacob as sender
    dock.setAccount(jacob);
    const jacobBal0 = await getBalance(dock.api, jacob.address, false);

    // Send tokens to Carol's EVM address.
    await endowEVMAddress(dock, carol.address, defaultEVMAccountEndowment());

    const carolNatBal1 = await getBalance(dock.api, carolSubsAddr, false);
    const carolWeb3Bal1 = await web3.eth.getBalance(carol.address);
    expect(carolNatBal1).toEqual(+carolWeb3Bal1 + 500);
    console.log(`Balance of Carol's address using web3: ${carolWeb3Bal1}`);
    console.log(`Balance of Carol's address using polkadot-js: ${carolNatBal1}`);

    // Carol's balance should increase
    expect(bnToBn(carolNatBal1).gt(bnToBn(carolNatBal0))).toBeTruthy();

    // Jacob's balance should decrease
    const jacobBal1 = await getBalance(dock.api, jacob.address, false);
    expect(bnToBn(jacobBal1).lt(bnToBn(jacobBal0))).toBeTruthy();
  }, 20000);

  test('Send tokens from EVM address to another EVM address derived from a native address', async () => {
    // Carol sends tokens from her EVM address to an intermediate EVM address created by Jacob

    // Jacob's intermediate EVM address
    const intermediateAddress = substrateAddrToEVMAddr(jacob.address);

    const jacobNatBal0 = await getBalance(dock.api, jacob.address, false);
    const intermBal0 = await web3.eth.getBalance(intermediateAddress);
    console.log(`Balance of the intermediate address using web3: ${intermBal0}`);
    console.log(`Balance of Jacob's address using polkadot-js: ${jacobNatBal0}`);

    // Carol sends tokens to the intermediate EVM address
    await sendTokensToEVMAddress(web3, carol, intermediateAddress, transferAmount, MinGasPrice, MaxGas);

    const intermBal1 = await web3.eth.getBalance(intermediateAddress);
    console.log(`Balance of the intermediate address using web3: ${intermBal1}`);

    // intermediate address's balance should increase
    expect(bnToBn(intermBal1).gt(bnToBn(intermBal0))).toBeTruthy();

    // Jacob's Native balance does not change
    const jacobNatBal1 = await getBalance(dock.api, jacob.address, false);
    console.log(`Balance of Jacob's address using polkadot-js: ${jacobNatBal1}`);
    expect(jacobNatBal1).toEqual(jacobNatBal0);
  }, 20000);

  test('Withdraw tokens from EVM address to a native address', async () => {
    // Withdraw from the intermediate address of Jacob to his native address

    // Jacob's intermediate EVM address
    const intermediateAddress = substrateAddrToEVMAddr(jacob.address);

    const jacobNatBal0 = await getBalance(dock.api, jacob.address, false);
    const intermBal0 = await web3.eth.getBalance(intermediateAddress);

    const withdraw = dock.api.tx.evm.withdraw(intermediateAddress, transferAmount);
    await dock.signAndSend(withdraw, false);

    const jacobNatBal1 = await getBalance(dock.api, jacob.address, false);
    const intermBal1 = await web3.eth.getBalance(intermediateAddress);
    expect(bnToBn(jacobNatBal1).gt(bnToBn(jacobNatBal0))).toBeTruthy();
    expect(bnToBn(intermBal0).gt(bnToBn(intermBal1))).toBeTruthy();
  }, 20000);
});
