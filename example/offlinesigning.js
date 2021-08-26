import { cryptoWaitReady } from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/keyring';
import {
  Registry, DEVNODE_INFO, buildTransferTxn, signTxn, decodeSignedTxn,
} from './offline-signing';
import { metadataRpc as metadata } from './offline-signing/devnode-metadata.json';

(async function main() {
  // charlie is try to send `value` tokens to dave
  const charlie = '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y';
  const dave = '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy';
  const secretUri = '//Charlie';
  const value = '100000';

  // Nonce is set to 0 as its charlie's 1st txn, after each txn from charlie, it needs to be incremented by 1
  const nonce = 2;

  // These need to be set when txn is being constructed. Set these to the most recent valid block.
  const blockHash = '0xb679f83bc6889815281ebe31a745b463c4a49b988158ed6c713d2051c86e0b54';
  const blockNumber = 105;

  // Specifies the longevity of the txn in terms of number of blocks
  const eraPeriod = 128;

  // Initialize the registry
  // @ts-ignore
  const registry = new Registry({ chainInfo: DEVNODE_INFO, metadata });

  // Build the transfer txn
  const txn = buildTransferTxn({
    from: charlie, to: dave, value, tip: 0, nonce, eraPeriod, blockNumber, blockHash, registry,
  });
  console.log('Unsigned Txn');
  console.log(txn.unsignedTxn);
  console.log();

  await cryptoWaitReady();
  const keyring = new Keyring({ type: 'sr25519' });

  // Sign the transfer txn
  // @ts-ignore
  const signedTxn = signTxn({
    keyring, secretUri, unsignedTxn: txn.unsignedTxn, signingPayload: txn.signingPayload, registry,
  });

  // `signedTxn` is the txn in hex that now needs to be broadcasted to the chain. It can be done through api-sidecar or similar tools.
  console.log('Signed txn');
  console.log(signedTxn);
  console.log();

  // Decode the signed txn
  const decoded = decodeSignedTxn(signedTxn, registry);
  console.log('Decoded txn');
  console.log(decoded);
  console.log();
}());
