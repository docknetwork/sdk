// The constants below are used for examples and tests

import {
  Statement,
  Witness,
  BBSKeypair,
  BBSPlusKeypairG2,
  BBSPlusPublicKeyG2,
  PSPublicKey,
  BBSPlusSignatureParamsG1,
  BBSPublicKey,
  BBSSignatureParams,
  PSKeypair,
  PSSignatureParams,
  PSSignature,
  BBSSignature,
  BBSPlusSignatureG1,
} from '@docknetwork/crypto-wasm-ts';
import dotenv from 'dotenv';
import BBSModule from '../src/modules/bbs';
import BBSPlusModule from '../src/modules/bbs-plus';
import PSModule from '../src/modules/ps';
import Presentation from '../src/presentation';
import Bls12381PSSignatureProofDock2023 from '../src/utils/vc/crypto/Bls12381PSSignatureProofDock2023';
import Bls12381BBSSignatureProofDock2023 from '../src/utils/vc/crypto/Bls12381BBSSignatureProofDock2023';
import Bls12381BBSSignatureProofDock2022 from '../src/utils/vc/crypto/Bls12381BBSSignatureProofDock2022';
import Bls12381BBSKeyPairDock2023 from '../src/utils/vc/crypto/Bls12381BBSKeyPairDock2023';
import Bls12381G2KeyPairDock2022 from '../src/utils/vc/crypto/Bls12381G2KeyPairDock2022';
import Bls12381PSKeyPairDock2023 from '../src/utils/vc/crypto/Bls12381PSKeyPairDock2023';

dotenv.config();
const DefaultFullNodeEndpoint = 'ws://localhost:9944';
const DefaultFullNodeTCPEndpoint = 'http://localhost:9933';
const DefaultTestKeyringType = 'sr25519';
const DefaultTestAccountURI = '//Alice';
const DefaultTestAccountCouncilMemberURI = '//Charlie';
const DefaultMinGasPrice = 50;
const DefaultMaxGas = 429496729;
const DefaultTestSchemes = 'BBS,BBSPlus,PS';

const boolEnv = (value) => value === 'true' || !!+value;

/**
 * Read variable from environment or use the default value
 * @param varName - The variable name to read from environment variable
 * @param defaultVal - The default value if the variable is not found in environment.
 * @returns {string|*}
 */
function fromEnv(varName, defaultVal) {
  if (varName in process.env) {
    return process.env[varName];
  }
  if (defaultVal !== undefined) {
    return defaultVal;
  }
  throw new Error(`Environment variable "${varName}" not defined`);
}

export const FullNodeEndpoint = fromEnv(
  'FullNodeEndpoint',
  DefaultFullNodeEndpoint,
);
export const FullNodeTCPEndpoint = fromEnv(
  'FullNodeTCPEndpoint',
  DefaultFullNodeTCPEndpoint,
);
export const TestKeyringOpts = {
  type: fromEnv('TestKeyringType', DefaultTestKeyringType),
};
export const TestAccountURI = fromEnv('TestAccountURI', DefaultTestAccountURI);
export const TestAccountCouncilMemberURI = fromEnv(
  'TestAccountCouncilMemberURI',
  DefaultTestAccountCouncilMemberURI,
);
export const MinGasPrice = fromEnv('MinGasPrice', DefaultMinGasPrice);
export const MaxGas = fromEnv('MaxGas', DefaultMaxGas);
export const TestSchemes = fromEnv('TestSchemes', DefaultTestSchemes);
export const DisableStatusListTests = boolEnv(
  fromEnv('DisableStatusListTests', 'false'),
);
export const DisableTrustRegistryTests = boolEnv(
  fromEnv('DisableTrustRegistryTests', 'false'),
);

export const BBS = {
  Name: 'BBS',
  Module: BBSModule,
  PublicKey: BBSPublicKey,
  Presentation,
  buildStatement: Statement.bbsSignature,
  buildWitness: Witness.bbsSignature,
  getModule: (dock) => dock.bbs,
  SignatureParams: BBSSignatureParams,
  Signature: BBSSignature,
  KeyPair: BBSKeypair,
  CryptoKeyPair: Bls12381BBSKeyPairDock2023,
  convertToPresentation:
    Bls12381BBSSignatureProofDock2023.convertToPresentation.bind(
      Bls12381BBSSignatureProofDock2023,
    ),
  SigType: 'Bls12381BBSSignatureDock2023',
  Context: 'https://ld.dock.io/security/bbs23/v1',
  VerKey: 'Bls12381BBSVerificationKeyDock2023',
  getParamsByDid: (api, did) => api.rpc.core_mods.bbsParamsByDid(did),
  getPublicKeyWithParamsByStorageKey: (api, storageKey) => api.rpc.core_mods.bbsPublicKeyWithParams(storageKey),
  getPublicKeysByDid: (api, did) => api.rpc.core_mods.bbsPublicKeysByDid(did.asDid),
};
export const BBSPlus = {
  Name: 'BBS+',
  Module: BBSPlusModule,
  PublicKey: BBSPlusPublicKeyG2,
  Presentation,
  buildStatement: Statement.bbsPlusSignature,
  buildWitness: Witness.bbsPlusSignature,
  getModule: (dock) => dock.bbsPlus,
  SignatureParams: BBSPlusSignatureParamsG1,
  Signature: BBSPlusSignatureG1,
  KeyPair: BBSPlusKeypairG2,
  CryptoKeyPair: Bls12381G2KeyPairDock2022,
  convertToPresentation:
    Bls12381BBSSignatureProofDock2022.convertToPresentation.bind(
      Bls12381BBSSignatureProofDock2022,
    ),
  Context: 'https://ld.dock.io/security/bbs/v1',
  VerKey: 'Bls12381G2VerificationKeyDock2022',
  SigType: 'Bls12381BBS+SignatureDock2022',
  getParamsByDid: (api, did) => api.rpc.core_mods.bbsPlusParamsByDid(did),
  getPublicKeyWithParamsByStorageKey: (api, storageKey) => api.rpc.core_mods.bbsPlusPublicKeyWithParams(storageKey),
  getPublicKeysByDid: (api, did) => api.rpc.core_mods.bbsPlusPublicKeysByDid(did.asDid),
};
export const PS = {
  Name: 'PS',
  Module: PSModule,
  PublicKey: PSPublicKey,
  Presentation,
  buildStatement: Statement.psSignature,
  buildWitness: Witness.psSignature,
  getModule: (dock) => dock.ps,
  SignatureParams: PSSignatureParams,
  Signature: PSSignature,
  KeyPair: PSKeypair,
  CryptoKeyPair: Bls12381PSKeyPairDock2023,
  convertToPresentation:
    Bls12381PSSignatureProofDock2023.convertToPresentation.bind(
      Bls12381PSSignatureProofDock2023,
    ),
  SigType: 'Bls12381PSSignatureDock2023',
  Context: 'https://ld.dock.io/security/ps/v1',
  VerKey: 'Bls12381PSVerificationKeyDock2023',
  getParamsByDid: (api, did) => api.rpc.core_mods.psParamsByDid(did),
  getPublicKeyWithParamsByStorageKey: (api, storageKey) => api.rpc.core_mods.psPublicKeyWithParams(storageKey),
  getPublicKeysByDid: (api, did) => api.rpc.core_mods.psPublicKeysByDid(did.asDid),
};
export const AllSchemes = Object.setPrototypeOf({ BBS, BBSPlus, PS }, null);

export const Schemes = TestSchemes.split(',').map((key) => {
  if (AllSchemes[key] == null) {
    throw new Error(`Invalid scheme ${key} provided in \`${TestSchemes}\` `);
  } else {
    return AllSchemes[key];
  }
});
