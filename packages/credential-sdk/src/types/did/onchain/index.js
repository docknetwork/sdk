import { Null, TypedNumber, TypedStruct } from "../../generic";

export * from "./constants";
export * from "./typed-did";
export * from "./controllers";
export * from "./verification-relationship";
export * from "./did-key";
export * from "./verification-method-signature";

export class DidMethodKeyDetails extends TypedStruct {
  static Classes = {
    nonce: TypedNumber,
    data: Null,
  };

  constructor(nonce) {
    super(nonce, null);
  }
}

export class OnchainDidDetailsValue extends TypedStruct {
  static Classes = {
    lastKeyId: TypedNumber,
    activeControllerKeys: TypedNumber,
    activeControllers: TypedNumber,
  };
}

export class StoredOnchainDidDetailsValue extends TypedStruct {
  static Classes = {
    nonce: TypedNumber,
    data: OnchainDidDetailsValue,
  };

  constructor(nonce, data) {
    super(nonce, data);
  }

  get lastKeyId() {
    return this.data.lastKeyId.value;
  }

  get activeControllerKeys() {
    return this.data.activeControllerKeys.value;
  }

  get activeControllers() {
    return this.data.activeControllers.value;
  }
}
