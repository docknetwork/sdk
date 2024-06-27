import { u8aToHex, hexToU8a } from '@polkadot/util';
import bs58 from 'bs58';
import varint from 'varint';
import { base58btc } from 'multiformats/bases/base58';

import { PublicKeyEd25519, PublicKeySecp256k1 } from '../../../public-keys';

import { parseDIDUrl } from '../../../resolver/did/did-resolver';

import {
  DidMethodKeyQualifier,
  DidMethodKeyBytePrefixEd25519,
  DidMethodKeyBytePrefixSecp256k1,
  Ed25519PublicKeyPrefix,
  Secp256k1PublicKeyPrefix,
} from '../constants';
import DockDidOrDidMethodKey from './dock-did-or-did-method-key';

/**
 * `did:key:*`
 *
 * As of now, the public key can be either `PublicKeyEd25519` or `PublicKeySecp256k1`.
 */
export default class DidMethodKey extends DockDidOrDidMethodKey {
  static Qualifier = DidMethodKeyQualifier;
  static Type = 'didMethodKey';
  /**
   * Instantiates `did:key:*` using supplied public key.
   * As of now, the public key can be either `PublicKeyEd25519` or `PublicKeySecp256k1`.
   *
   * @param {PublicKeyEd25519|PublicKeySecp256k1} didMethodKey
   */
  constructor(didMethodKey) {
    super(didMethodKey);

    if (
      !(
        didMethodKey instanceof PublicKeyEd25519
        || didMethodKey instanceof PublicKeySecp256k1
      )
    ) {
      throw new Error('Unsupported public key type');
    }
  }

  /**
   * Creates a new `DidMethodKey` from the supplied keypair.
   *
   * @param {DockKeypair} keypair
   * @returns {DidMethodKey}
   */
  static fromKeypair(keypair) {
    return new this(keypair.publicKey());
  }

  /**
   * Instantiates `DidMethodKey` from a fully qualified did string.
   * @param {string} did - fully qualified `did:key:*` string
   * @returns {DidMethodKey}
   */
  static fromQualifiedString(did) {
    const { id } = parseDIDUrl(did);

    const multicodecPubKey = base58btc.decode(id);
    varint.decode(multicodecPubKey); // NOTE: called to get byte length below
    const pubKeyBytes = multicodecPubKey.slice(varint.decode.bytes);
    const pubkeyHex = u8aToHex(pubKeyBytes);

    if (id.startsWith(Secp256k1PublicKeyPrefix)) {
      return new this(new PublicKeySecp256k1(pubkeyHex));
    } else if (id.startsWith(Ed25519PublicKeyPrefix)) {
      return new this(new PublicKeyEd25519(pubkeyHex));
    } else {
      throw new Error(`Unsupported \`did:key:*\`: \`${did}\``);
    }
  }

  /**
   * Instantiates `DidMethodKey` from an unqualified did string.
   * @param {string} did - BS58 encoded did key.
   * @returns {DidMethodKey}
   */
  static fromUnqualifiedString(did) {
    return this.fromQualifiedString(`did:key:${did}`);
  }

  /**
   * Instantiates `DockDid` from a did method key object received from the substrate side.
   * @param {object} key - substrate did method key
   * @returns {DidMethodKey}
   */
  static fromSubstrateValue(did) {
    const key = did.asDidMethodKey;

    if (key.isSecp256k1) {
      return new this(new PublicKeySecp256k1(u8aToHex(key.asSecp256k1)));
    } else if (key.isEd25519) {
      return new this(new PublicKeyEd25519(u8aToHex(key.asEd25519)));
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

  /**
   * Returns underlying public key.
   * @returns {PublicKeyEd25519|PublicKeySecp256k1}
   */
  get publicKey() {
    return this.didMethodKey;
  }

  /**
   * Returns unqualified public key encoded in `BS58`.
   */
  toEncodedString() {
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
    return `z${bs58.encode(didKeyBytes)}`;
  }
}

DockDidOrDidMethodKey.DidMethodKey = DidMethodKey;
