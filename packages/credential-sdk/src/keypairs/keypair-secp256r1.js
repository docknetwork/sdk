import elliptic from 'elliptic';
import { sha256 } from 'js-sha256';

import { SignatureSecp256r1 } from '../types/signatures';
import { EcdsaSecp256r1VerKeyName } from '../vc/crypto/constants';
import DockKeypair from './dock-keypair';
import { hexToU8a, normalizeToU8a, valueBytes } from '../utils';

const EC = elliptic.ec;
const secp256r1Curve = new EC('p256');

function encodeDERInt(intBytes) {
  let i = 0;
  while (i < intBytes.length && intBytes[i] === 0) {
    i++;
  }

  let trimmedBytes = intBytes.slice(i);

  // eslint-disable-next-line no-bitwise
  if (trimmedBytes[0] & 0x80) {
    trimmedBytes = Uint8Array.of(0, ...trimmedBytes);
  }

  const { length } = trimmedBytes;
  return [0x02, length, ...trimmedBytes];
}

export default class Secp256r1Keypair extends DockKeypair {
  static Signature = SignatureSecp256r1;

  static VerKeyType = EcdsaSecp256r1VerKeyName;

  static SeedSize = 32;

  constructor(entropyOrPrivate, sourceType = 'entropy') {
    let kp;
    switch (sourceType) {
      case 'entropy':
        if (entropyOrPrivate == null) {
          throw new Error('Entropy must be provided');
        }

        kp = secp256r1Curve.genKeyPair({
          entropy: entropyOrPrivate,
        });
        break;
      case 'private':
        kp = secp256r1Curve.keyFromPrivate(normalizeToU8a(entropyOrPrivate));
        break;
      default:
        throw new Error(
          `Unknown source type: \`${sourceType}\`, it must be either "entropy" or "private"`,
        );
    }

    super(kp);
  }

  _publicKey() {
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

    const r = sig.r.toString('hex', 32);
    const s = sig.s.toString('hex', 32);
    const i = sig.recoveryParam.toString(16).padStart(2, '0');

    return hexToU8a(`0x${r}${s}${i}`);
  }

  static signatureToDER(signature) {
    const sigBytes = valueBytes(signature);
    if (sigBytes.length !== 65) {
      throw new Error(
        `Invalid signature length. Expected is 65 bytes, received ${sigBytes.length}`,
      );
    }

    const r = sigBytes.slice(0, 32);
    const s = sigBytes.slice(32, 64);

    const rEncoded = encodeDERInt(r);
    const sEncoded = encodeDERInt(s);

    const totalLength = rEncoded.length + sEncoded.length;

    const der = new Uint8Array(2 + totalLength);
    der[0] = 0x30;
    der[1] = totalLength;

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

    return secp256r1Curve.verify(
      this.hash(message),
      bytes,
      valueBytes(publicKey),
    );
  }
}
