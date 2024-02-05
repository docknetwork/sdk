import { u8aToHex, hexToU8a } from "@polkadot/util";
import { base58btc } from "multiformats/bases/base58";
import bs58 from "bs58";
import varint from "varint";

import { getHexIdentifier } from "../../codec";
import { PublicKeyEd25519, PublicKeySecp256k1 } from "../../../public-keys";

import { parseDIDUrl } from "../../../resolver/did/did-resolver";

import {
  DidMethodKeyQualifier,
  DidMethodKeyBytePrefixEd25519,
  DidMethodKeyBytePrefixSecp256k1,
  DidMethodKeyEd25519ByteSize,
  DidMethodKeySecp256k1ByteSize,
} from "../constants";
import { DockKeyPair } from "../../misc";
import DockDidOrDidMethodKey from './dock-did-or-did-method-key';

/**
 * `did:key:*`
 *
 * As of now, the public key can be either `PublicKeyEd25519` or `PublicKeySecp256k1`.
 */
export default class DidMethodKey extends DockDidOrDidMethodKey {
  /**
   * Instantiates `did:key:*` using supplied public key.
   * As of now, the public key can be either `PublicKeyEd25519` or `PublicKeySecp256k1`.
   *
   * @param {PublicKeyEd25519|PublicKeySecp256k1} didMethodKey
   */
  constructor(didMethodKey) {
    super();

    if (didMethodKey instanceof PublicKeyEd25519) {
      this.didMethodKey = { ed25519: didMethodKey.value };
    } else if (didMethodKey instanceof PublicKeySecp256k1) {
      this.didMethodKey = { secp256k1: didMethodKey.value };
    } else {
      throw new Error("Unsupported public key type");
    }
  }

  /**
   * Creates a new `DidMethodKey` from the supplied keypair.
   *
   * @param {DockKeyPair} keypair
   * @returns {this}
   */
  static fromKeypair(keypair) {
    return new this(keypair.publicKey());
  }

  /**
   * Instantiates `DidMethodKey` from a fully qualified did string.
   * @param {string} did - fully qualified `did:key:*` string
   * @returns {this}
   */
  static fromQualifiedString(did) {
    const { id } = parseDIDUrl(did);

    const multicodecPubKey = base58btc.decode(id);
    varint.decode(multicodecPubKey); // NOTE: called to get byte length below
    const pubKeyBytes = multicodecPubKey.slice(varint.decode.bytes);
    const pubkeyHex = u8aToHex(pubKeyBytes);

    if (id.startsWith(DidMethodKeySecp256k1Prefix)) {
      return new this(new PublicKeySecp256k1(pubkeyHex));
    } else if (id.startsWith(DidMethodKeyEd25519Prefix)) {
      return new this(new PublicKeyEd25519(pubkeyHex));
    } else {
      throw new Error("Unsupported `did:key:*`");
    }
  }

  /**
   * Instantiates `DockDid` from a did method key object received from the substrate side.
   * @param {object} key - substrate did method key
   * @returns {this}
   */
  static fromSubstrate(did) {
    const key = did.asDidMethodKey;

    if (key.isSecp256k1) {
      const hex = getHexIdentifier(
        u8aToHex(key.asSecp256k1),
        [],
        DidMethodKeySecp256k1ByteSize
      );

      return new this(new PublicKeySecp256k1(hex));
    } else if (key.isEd25519) {
      const hex = getHexIdentifier(
        u8aToHex(key.asEd25519),
        [],
        DidMethodKeyEd25519ByteSize
      );

      return new this(new PublicKeyEd25519(hex));
    } else {
      throw new Error(`Invalid \`did:key:*\`: provided: \`${key}\``);
    }
  }

  get isDidMethodKey() {
    return true;
  }

  get asDidMethodKey() {
    return this.didMethodKey;
  }

  toJSON() {
    return {
      DidMethodKey: this.didMethodKey.ed25519
        ? { Ed25519: this.didMethodKey.ed25519 }
        : { Secp256k1: this.didMethodKey.secp256k1 },
    };
  }

  toString() {
    return this.toQualifiedString();
  }

  /**
   * Returns fully qualified public key encoded in `BS58` according to the `did:key:*` spec.
   */
  toQualifiedString() {
    // Convert the hex public key to bytes
    if (!this.publicKey) {
      throw new Error("Unsupported public key type");
    }

    // Define the prefix for ed25519 DID key
    const publicKeyBytes = hexToU8a(this.publicKey.value);
    const prefix = this.didMethodKey.ed25519
      ? DidMethodKeyBytePrefixEd25519
      : DidMethodKeyBytePrefixSecp256k1;

    // Concatenate the prefix and the public key bytes
    const didKeyBytes = new Uint8Array(prefix.length + publicKeyBytes.length);
    didKeyBytes.set(prefix);
    didKeyBytes.set(publicKeyBytes, prefix.length);

    // Encode the concatenated bytes to Base58 with z prefix
    const encodedDidKey = `z${bs58.encode(didKeyBytes)}`;

    return `${DidMethodKeyQualifier}${encodedDidKey}`;
  }

  /**
   * Returns underlying public key.
   * @returns {PublicKeyEd25519|PublicKeySecp256k1}
   */
  get publicKey() {
    return this.didMethodKey.ed25519
      ? new PublicKeyEd25519(this.didMethodKey.ed25519)
      : new PublicKeySecp256k1(this.didMethodKey.secp256k1);
  }
}

DockDidOrDidMethodKey.DidMethodKey = DidMethodKey;
