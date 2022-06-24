import { blake2AsHex, decodeAddress } from '@polkadot/util-crypto';
import { hexToU8a, u8aToHex, bnToBn } from '@polkadot/util';
import { asDockAddress } from './codec';

require('dotenv').config();

const {
  Network, MinGasPrice, MaxGas,
} = process.env;

// Convert EVM address to Substrate address
export function evmAddrToSubstrateAddr(evmAddr) {
  const bytes = hexToU8a(evmAddr);
  // Hash(evm:||EVM address) => Substrate address
  const prefix = 'evm:';
  const preimage = [0, 1, 2, 3].map((i) => prefix.charCodeAt(i)).concat(...bytes);
  // @ts-ignore
  return asDockAddress(blake2AsHex(preimage), Network);
}

// Convert Substrate address to EVM address
export function substrateAddrToEVMAddr(address) {
  const bytes = decodeAddress(address);
  return u8aToHex(bytes.slice(0, 20));
}

// Give `amount` of Dock tokens to EVM address. `amount` defaults to the number of tokens required to pay of maximum gas
export function endowEVMAddress(dock, evmAddr, amount) {
  //  Convert EVM address to a Substrate address
  const substrateAddr = evmAddrToSubstrateAddr(evmAddr);

  // Selecting the amount such that it can pay fees for the upto the maximum gas allowed and some extra
  const amt = amount !== undefined ? amount : bnToBn(MinGasPrice).mul(bnToBn(MaxGas)).muln(2);

  // Transfer to the Substrate address created above
  const transfer = dock.api.tx.balances.transfer(substrateAddr, amt);
  return dock.signAndSend(transfer, false);
}
