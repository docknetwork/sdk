import elliptic from 'elliptic';
import { sha256 } from 'js-sha256';

import { SignatureSecp256k1 } from '../types/signatures';
import { EcdsaSecp256k1VerKeyName } from '../vc/crypto/constants';
import DockKeypair from './keypair';
import { hexToU8a, valueBytes } from '../utils';

const EC = elliptic.ec;
const secp256k1Curve = new EC('secp256k1');

export default class Secp256k1Keypair extends DockKeypair {
  static Signature = SignatureSecp256k1;

  static VerKeyType = EcdsaSecp256k1VerKeyName;

  static SeedSize = 32;

  static _fromSeed = (entropy) => secp256k1Curve.genKeyPair({
    entropy,
  });

  static _fromPrivateKey = (secretKey) => secp256k1Curve.keyFromPrivate(secretKey);

  _publicKey() {
    // public key is in hex but doesn't contain a leading zero
    return hexToU8a(`0x${this.keyPair.getPublic(true, 'hex')}`);
  }

  privateKey() {
    return hexToU8a(`0x${this.keyPair.getPrivate(true, 'hex')}`);
  }

  _sign(message) {
    const hash = this.constructor.hash(message);
    const sig = this.keyPair.sign(hash, {
      canonical: true,
    });

    // The signature is recoverable in 65-byte { R | S | index } format
    const r = sig.r.toString('hex', 32);
    const s = sig.s.toString('hex', 32);
    const i = sig.recoveryParam.toString(16).padStart(2, '0');

    // Make it proper hex
    return hexToU8a(`0x${r}${s}${i}`);
  }

  static hash(message) {
    return sha256.digest(message);
  }

  static verify(message, signature, publicKey) {
    return secp256k1Curve.verify(
      this.hash(message),
      valueBytes(signature),
      valueBytes(publicKey),
    );
  }
}
