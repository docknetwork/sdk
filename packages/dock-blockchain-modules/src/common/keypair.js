import { DidKeypair } from '@docknetwork/credential-sdk/keypairs';
import { ensureInstanceOf } from '@docknetwork/credential-sdk/utils';

export const allSigners = (didKeypair) => [].concat(didKeypair).map((keyPair) => ensureInstanceOf(keyPair, DidKeypair));

export const firstSigner = (didKeypair) => {
  const signers = allSigners(didKeypair);
  if (signers.length !== 1) {
    throw new Error(`Must provide 1 valid did keypair, received ${signers.length}`);
  }

  return signers[0];
};

export const ensureTargetKeypair = (targetDid, didKeypair) => {
  const includes = allSigners(didKeypair)
    .some(
      (keyPair) => keyPair.did.eq(targetDid),
    );

  if (!includes) {
    throw new Error(`No keypair provided for ${targetDid}`);
  }
};
