import { TypedEnum, option, withProp } from "../../generic";
import {
  Bls12381BBS23DockVerKeyName,
  Bls12381BBSDockVerKeyName,
  Bls12381PSDockVerKeyName,
} from "../../../vc/crypto";
import {
  BBSPublicKeyValue,
  BBSPlusPublicKeyValue,
  PSPublicKeyValue,
  BBDT16PublicKeyValue,
} from "./value";
import {
  CheqdMainnetOffchainSignatureParamsRef,
  CheqdOffchainSignatureParamsRef,
  CheqdTestnetOffchainSignatureParamsRef,
  DockOffchainSignatureParamsRef,
} from "./ref";
import { Bls12381BBDT16DockVerKeyName } from "../../../vc/crypto/constants";
import { BBDT16Params, BBSParams, BBSPlusParams, PSParams } from "../params";
import { maybeToJSONString } from "../../../utils";

export class OffchainSignaturePublicKey extends TypedEnum {
  get bytes() {
    return this.value.bytes;
  }

  get paramsRef() {
    return this.value.paramsRef;
  }

  get curveType() {
    return this.value.curveType;
  }

  get participantId() {
    return this.value.participantId;
  }

  get params() {
    return this.value.params;
  }

  setParams(params) {
    const WithParams = withProp(
      this.constructor,
      "params",
      option(this.constructor.Params)
    );

    const withParams = WithParams.from(this);
    withParams.value.params = params;

    return withParams;
  }

  async withParams(paramsModule) {
    let params = null;
    if (this.paramsRef != null) {
      params = await paramsModule.getParams(...this.paramsRef);

      if (params == null) {
        throw new Error(
          `Parameters with reference (${maybeToJSONString(
            this.paramsRef
          )}) not found on chain`
        );
      }
    }

    return this.setParams(params);
  }
}
export class BBSPublicKey extends OffchainSignaturePublicKey {
  static Class = BBSPublicKeyValue;

  static Params = BBSParams;

  static Type = "bbs";

  static VerKeyType = Bls12381BBS23DockVerKeyName;
}
export class BBSPlusPublicKey extends OffchainSignaturePublicKey {
  static Class = BBSPlusPublicKeyValue;

  static Params = BBSPlusParams;

  static Type = "bbsPlus";

  static VerKeyType = Bls12381BBSDockVerKeyName;
}
export class PSPublicKey extends OffchainSignaturePublicKey {
  static Class = PSPublicKeyValue;

  static Params = PSParams;

  static Type = "ps";

  static VerKeyType = Bls12381PSDockVerKeyName;
}
export class BBDT16PublicKey extends OffchainSignaturePublicKey {
  static Class = BBDT16PublicKeyValue;

  static Params = BBDT16Params;

  static Type = "bbdt16";

  static VerKeyType = Bls12381BBDT16DockVerKeyName;
}

OffchainSignaturePublicKey.bindVariants(
  BBSPublicKey,
  BBSPlusPublicKey,
  PSPublicKey,
  BBDT16PublicKey
);

export class DockOffchainSignaturePublicKey extends withProp(
  OffchainSignaturePublicKey,
  "paramsRef",
  option(DockOffchainSignatureParamsRef)
) {}

export class CheqdOffchainSignaturePublicKey extends withProp(
  OffchainSignaturePublicKey,
  "paramsRef",
  option(CheqdOffchainSignatureParamsRef)
) {}

export class CheqdTestnetOffchainSignaturePublicKey extends withProp(
  OffchainSignaturePublicKey,
  "paramsRef",
  option(CheqdTestnetOffchainSignatureParamsRef)
) {}
export class CheqdMainnetOffchainSignaturePublicKey extends withProp(
  OffchainSignaturePublicKey,
  "paramsRef",
  option(CheqdMainnetOffchainSignatureParamsRef)
) {}

export * from "./value";
export * from "./ref";
export * from "./id";
