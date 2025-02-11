import {
  generateAccumulatorModuleTests,
  generateAttestModuleTests,
  generateBlobModuleTests,
  generateDIDModuleTests,
  generateOffchainSignatureModuleTests,
  generateStatusListCredentialModuleTests,
} from "@docknetwork/credential-sdk/modules/tests";
import { CheqdParamsId } from "@docknetwork/credential-sdk/types";
import { tests } from "./common";

tests("AccumulatorModule", generateAccumulatorModuleTests);
tests("AttestModule", generateAttestModuleTests);
tests("BlobModule", generateBlobModuleTests);
tests("DIDModule", generateDIDModuleTests, { ParamsId: CheqdParamsId });
tests("OffchainSignaturesModule", generateOffchainSignatureModuleTests);
tests("StatusListCredentialModule", generateStatusListCredentialModuleTests);
