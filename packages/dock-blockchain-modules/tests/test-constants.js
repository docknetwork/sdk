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
  BBDT16KeypairG1,
  BBDT16Mac,
  BBDT16MacParams,
} from "@docknetwork/credential-sdk/crypto";
import dotenv from "dotenv";
import { DockBBSModule, DockBBSPlusModule, DockPSModule } from "../src";
import Presentation from "@docknetwork/credential-sdk/vc/presentation";
import {
  Bls12381PSSignatureProofDock2023,
  Bls12381BBSSignatureProofDock2023,
  Bls12381BBSSignatureProofDock2022,
  Bls12381BBSKeyPairDock2023,
  Bls12381G2KeyPairDock2022,
  Bls12381PSKeyPairDock2023,
  Bls12381BBDT16KeyPairDock2024,
  Bls12381BBDT16MACProofDock2024,
} from "@docknetwork/credential-sdk/vc/crypto";

dotenv.config();
const DefaultFullNodeEndpoint = "ws://127.0.0.1:9944";
const DefaultFullNodeTCPEndpoint = "http://127.0.0.1:9933";
const DefaultTestKeyringType = "sr25519";
const DefaultTestAccountURI = "//Alice";
const DefaultTestAccountCouncilMemberURI = "//Charlie";
const DefaultMinGasPrice = 50;
const DefaultMaxGas = 429496729;
const DefaultTestSchemes = "BBS,BBSPlus,PS,BBDT16";

const boolEnv = (value) => value === "true" || !!+value;

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
  "FullNodeEndpoint",
  DefaultFullNodeEndpoint
);
export const FullNodeTCPEndpoint = fromEnv(
  "FullNodeTCPEndpoint",
  DefaultFullNodeTCPEndpoint
);
export const TestKeyringOpts = {
  type: fromEnv("TestKeyringType", DefaultTestKeyringType),
};
export const TestAccountURI = fromEnv("TestAccountURI", DefaultTestAccountURI);
export const TestAccountCouncilMemberURI = fromEnv(
  "TestAccountCouncilMemberURI",
  DefaultTestAccountCouncilMemberURI
);
export const MinGasPrice = fromEnv("MinGasPrice", DefaultMinGasPrice);
export const MaxGas = fromEnv("MaxGas", DefaultMaxGas);
export const TestSchemes = fromEnv("TestSchemes", DefaultTestSchemes);
export const DisableTrustRegistryParticipantsTests = boolEnv(
  fromEnv("DisableTrustRegistryParticipantsTests", "false")
);

export const BBS = {
  Name: "BBS",
  Module: DockBBSModule,
  PublicKey: BBSPublicKey,
  Presentation,
  buildProverStatement: Statement.bbsSignatureProver,
  buildVerifierStatement: Statement.bbsSignatureVerifier,
  buildWitness: Witness.bbsSignature,
  getModule: (dock) => new DockBBSModule(dock),
  SignatureParams: BBSSignatureParams,
  Signature: BBSSignature,
  KeyPair: BBSKeypair,
  CryptoKeyPair: Bls12381BBSKeyPairDock2023,
  derivedToAnoncredsPresentation:
    Bls12381BBSSignatureProofDock2023.derivedToAnoncredsPresentation.bind(
      Bls12381BBSSignatureProofDock2023
    ),
  SigType: "Bls12381BBSSignatureDock2023",
  Context: "https://ld.dock.io/security/bbs23/v1",
  VerKey: "Bls12381BBSVerificationKeyDock2023",
  getParamsByDid: (api, did) => api.rpc.core_mods.bbsParamsByDid(did),
  getPublicKeyWithParamsByStorageKey: (api, storageKey) =>
    api.rpc.core_mods.bbsPublicKeyWithParams(storageKey),
  getPublicKeysByDid: (api, did) =>
    api.rpc.core_mods.bbsPublicKeysByDid(did.asDid),
};
export const BBSPlus = {
  Name: "BBS+",
  Module: DockBBSPlusModule,
  PublicKey: BBSPlusPublicKeyG2,
  Presentation,
  buildProverStatement: Statement.bbsPlusSignatureProver,
  buildVerifierStatement: Statement.bbsPlusSignatureVerifier,
  buildWitness: Witness.bbsPlusSignature,
  getModule: (dock) => new DockBBSPlusModule(dock),
  SignatureParams: BBSPlusSignatureParamsG1,
  Signature: BBSPlusSignatureG1,
  KeyPair: BBSPlusKeypairG2,
  CryptoKeyPair: Bls12381G2KeyPairDock2022,
  derivedToAnoncredsPresentation:
    Bls12381BBSSignatureProofDock2022.derivedToAnoncredsPresentation.bind(
      Bls12381BBSSignatureProofDock2022
    ),
  Context: "https://ld.dock.io/security/bbs/v1",
  VerKey: "Bls12381G2VerificationKeyDock2022",
  SigType: "Bls12381BBS+SignatureDock2022",
  getParamsByDid: (api, did) => api.rpc.core_mods.bbsPlusParamsByDid(did),
  getPublicKeyWithParamsByStorageKey: (api, storageKey) =>
    api.rpc.core_mods.bbsPlusPublicKeyWithParams(storageKey),
  getPublicKeysByDid: (api, did) =>
    api.rpc.core_mods.bbsPlusPublicKeysByDid(did.asDid),
};
export const PS = {
  Name: "PS",
  Module: DockPSModule,
  PublicKey: PSPublicKey,
  Presentation,
  buildProverStatement: Statement.psSignature,
  buildVerifierStatement: Statement.psSignature,
  buildWitness: Witness.psSignature,
  getModule: (dock) => new DockPSModule(dock),
  SignatureParams: PSSignatureParams,
  Signature: PSSignature,
  KeyPair: PSKeypair,
  CryptoKeyPair: Bls12381PSKeyPairDock2023,
  derivedToAnoncredsPresentation:
    Bls12381PSSignatureProofDock2023.derivedToAnoncredsPresentation.bind(
      Bls12381PSSignatureProofDock2023
    ),
  SigType: "Bls12381PSSignatureDock2023",
  Context: "https://ld.dock.io/security/ps/v1",
  VerKey: "Bls12381PSVerificationKeyDock2023",
  getParamsByDid: (api, did) => api.rpc.core_mods.psParamsByDid(did),
  getPublicKeyWithParamsByStorageKey: (api, storageKey) =>
    api.rpc.core_mods.psPublicKeyWithParams(storageKey),
  getPublicKeysByDid: (api, did) =>
    api.rpc.core_mods.psPublicKeysByDid(did.asDid),
};

export const BBDT16 = {
  Name: "BBDT16",
  Module: undefined,
  PublicKey: undefined,
  Presentation,
  buildProverStatement: Statement.bbdt16Mac,
  buildVerifierStatement: Statement.bbdt16Mac,
  buildWitness: Witness.bbdt16Mac,
  getModule: (_) => undefined,
  SignatureParams: BBDT16MacParams,
  Signature: BBDT16Mac,
  KeyPair: BBDT16KeypairG1,
  CryptoKeyPair: Bls12381BBDT16KeyPairDock2024,
  derivedToAnoncredsPresentation:
    Bls12381BBDT16MACProofDock2024.derivedToAnoncredsPresentation.bind(
      Bls12381BBDT16MACProofDock2024
    ),
  SigType: "Bls12381BBDT16MACDock2024",
  Context: "https://ld.dock.io/security/bbdt16/v1",
  VerKey: undefined,
  getParamsByDid: (_, __) => undefined,
  getPublicKeyWithParamsByStorageKey: (_, __) => undefined,
  getPublicKeysByDid: (_, __) => undefined,
};

export const AllSchemes = Object.setPrototypeOf(
  {
    BBS,
    BBSPlus,
    PS,
    BBDT16,
  },
  null
);

export const Schemes = TestSchemes.split(",").map((key) => {
  if (AllSchemes[key] == null) {
    throw new Error(`Invalid scheme ${key} provided in \`${TestSchemes}\` `);
  } else {
    return AllSchemes[key];
  }
});
