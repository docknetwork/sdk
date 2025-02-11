import generateDIDModuleTests from "@docknetwork/credential-sdk/modules/tests/did-module";
import { CheqdParamsId } from "@docknetwork/credential-sdk/types";
import { tests } from "./common";

tests("DIDModule", generateDIDModuleTests, { ParamsId: CheqdParamsId });
