import elliptic from 'elliptic';
import { sha256 } from 'js-sha256';

import { SignatureSecp256k1 } from '../types/signatures';
import { EcdsaSecp256k1VerKeyName } from '../vc/crypto/constants';
import DockKeypair from './keypair';
import { hexToU8a, valueBytes } from '../utils';

const EC = elliptic.ec;
const secp256k1Curve = new EC('secp256k1');

function encodeDERInt(intBytes) {
  // Remove leading zeros
  let i = 0;
  while (i < intBytes.length && intBytes[i] === 0) {
    i++;
  }

  let trimmedBytes = intBytes.slice(i);

  // Ensure the integer is positive by adding a leading zero if needed
  // eslint-disable-next-line no-bitwise
  if (trimmedBytes[0] & 0x80) {
    trimmedBytes = Uint8Array.of(0, ...trimmedBytes);
  }

  const { length } = trimmedBytes;
  return [0x02, length, ...trimmedBytes];
}

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
    return hexToU8a(`0x${this.keyPair.getPrivate('hex')}`);
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

  static signatureToDER(signature) {
    const sigBytes = valueBytes(signature);
    if (sigBytes.length !== 65) {
      throw new Error(
        `Invalid signature length. Expected is 65 bytes, received ${signature.length}`,
      );
    }
    // Extract R, S components
    const r = sigBytes.slice(0, 32); // First 32 bytes
    const s = sigBytes.slice(32, 64); // Next 32 bytes

    // Encode R and S into DER format
    const rEncoded = encodeDERInt(r);
    const sEncoded = encodeDERInt(s);

    // Calculate total length
    const totalLength = rEncoded.length + sEncoded.length;

    // Create Uint8Array for DER encoding
    const der = new Uint8Array(2 + totalLength); // 2 bytes for tag and length + total payload
    der[0] = 0x30; // DER sequence tag
    der[1] = totalLength; // Total length of R + S encoded

    // Copy encoded R and S into DER array
    der.set(rEncoded, 2);
    der.set(sEncoded, 2 + rEncoded.length);

    return der;
  }

  static hash(message) {
    return sha256.digest(message);
  }

  static verify(message, signature, publicKey) {
    let bytes = valueBytes(signature);

    if (bytes.length === 65) {
      bytes = this.signatureToDER(bytes);
    }
    return secp256k1Curve.verify(
      this.hash(message),
      bytes,
      valueBytes(publicKey),
    );
  }
}
