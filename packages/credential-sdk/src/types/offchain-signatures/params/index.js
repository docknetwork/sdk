import { TypedEnum } from "../../generic";
import { BBSParamsValue, BBSPlusParamsValue, PSParamsValue } from "./value";

export class OffchainSignatureParams extends TypedEnum {
  get bytes() {
    return this.value.bytes;
  }

  get label() {
    return this.value.label;
  }

  get curveType() {
    return this.value.curveType;
  }
}
export class BBSParams extends OffchainSignatureParams {
  static Type = "bbs";

  static Class = BBSParamsValue;
}
export class BBSPlusParams extends OffchainSignatureParams {
  static Type = "bbsPlus";

  static Class = BBSPlusParamsValue;
}
export class PSParams extends OffchainSignatureParams {
  static Type = "ps";

  static Class = PSParamsValue;
}
export class BBDT16Params extends OffchainSignatureParams {
  static Type = "bbdt16";

  static Class = BBDT16Params;
}

OffchainSignatureParams.bindVariants(BBSParams, BBSPlusParams, PSParams);

export * from "./value";
export * from "./id";
