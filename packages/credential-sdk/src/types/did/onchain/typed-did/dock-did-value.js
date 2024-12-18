import { DockDIDQualifier } from "../constants";
import { decodeFromSS58, encodeAsSS58, isHex } from "../../../../utils";
import {
  withQualifier,
  TypedBytes,
  sized,
  TypedNumber,
  TypedStruct,
} from "../../../generic";
import DidOrDidMethodKeySignature from "./signature";
import { Signature } from "../../../signatures";

/**
 * `did:dock:*`
 */
export default class DockDidValue extends sized(withQualifier(TypedBytes)) {
  static Qualifier = DockDIDQualifier;

  static Type = "did";

  static Size = 32;

  static fromUnqualifiedString(did) {
    return new this(isHex(did) ? did : decodeFromSS58(did));
  }

  /**
   * Returns unqualified DID encoded as a `SS58` address.
   */
  toEncodedString() {
    return encodeAsSS58(this.value);
  }

  signWith(keyPair, bytes) {
    // eslint-disable-next-line no-use-before-define
    return new DockDidSignature(
      // eslint-disable-next-line no-use-before-define
      new DockDidSignatureValue(this, keyPair.keyId, keyPair.sign(bytes))
    );
  }
}

export class DockDidSignatureValue extends TypedStruct {
  static Classes = {
    did: DockDidValue,
    keyId: class KeyId extends TypedNumber {},
    sig: Signature,
  };
}

export class DockDidSignature extends DidOrDidMethodKeySignature {
  static Type = "didSignature";

  static Class = DockDidSignatureValue;
}
