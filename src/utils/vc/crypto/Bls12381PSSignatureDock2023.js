import {
  PSCredential,
  PSCredentialBuilder,
} from '@docknetwork/crypto-wasm-ts';

import { Bls12381PSSigDockSigName } from './constants';

import Bls12381PSKeyPairDock2023 from './Bls12381PSKeyPairDock2023';
import DockCryptoSignature from './common/DockCryptoSignature';

/**
 * A PS signature suite for use with BLS12-381 Dock key pairs
 */
export default class Bls12381PSSignatureDock2023 extends DockCryptoSignature {
  /**
   * Default constructor
   * @param options {SignatureSuiteOptions} options for constructing the signature suite
   */
  constructor(options = {}) {
    super(
      { ...options, signer: options.signer || Bls12381PSSignatureDock2023.signerFactory(options.keypair, options.verificationMethod) },
      Bls12381PSSigDockSigName,
      Bls12381PSKeyPairDock2023,
      'https://ld.dock.io/security/ps/v1',
    );
  }
}

Bls12381PSSignatureDock2023.KeyPair = Bls12381PSKeyPairDock2023;
Bls12381PSSignatureDock2023.CredentialBuilder = PSCredentialBuilder;
Bls12381PSSignatureDock2023.Credential = PSCredential;
Bls12381PSSignatureDock2023.proofType = [
  Bls12381PSSigDockSigName,
  `sec:${Bls12381PSSigDockSigName}`,
  `https://w3id.org/security#${Bls12381PSSigDockSigName}`,
];
