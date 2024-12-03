import { DidKeypair } from '@docknetwork/credential-sdk/keypairs';
import { ensureInstanceOf } from '@docknetwork/credential-sdk/utils';

export const allSigners = (didKeypair) => [].concat(didKeypair).map((keyPair) => ensureInstanceOf(keyPair, DidKeypair));

export const firstSigner = (didKeypair) => {
  const signers = allSigners(didKeypair);
  if (signers.length !== 1) {
    throw new Error(`Must provide 1 valid DID keypair, received ${signers.length}`);
  }

  return signers[0];
};

export const targetKeypair = (targetDid, didKeypair) => {
  const signerKp = allSigners(didKeypair)
    .find(
      (keyPair) => keyPair.did.eq(targetDid),
    );

  if (signerKp == null) {
    throw new Error(`No keypair provided for ${targetDid}`);
  }

  return signerKp;
};
