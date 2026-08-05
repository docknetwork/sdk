import {
  Ed25519KeyPair,
} from '@transmute/ed25519-key-pair';
import {
  Secp256k1KeyPair,
} from '@transmute/secp256k1-key-pair';

import crypto from 'crypto';
import { JWS } from '@transmute/jose-ld';

import {
  WebCryptoKey,
  JsonWebKey2020,
} from '@transmute/web-crypto-key-pair';

export { JsonWebKey2020 };

const getKeyPairForKtyAndCrv = (kty, crv) => {
  if (kty === 'OKP' && crv === 'Ed25519') {
    return Ed25519KeyPair;
  }
  if (kty === 'EC' && crv === 'secp256k1') {
    return Secp256k1KeyPair;
  }
  if (kty === 'EC' && ['P-256', 'P-384', 'P-521'].includes(crv)) {
    return WebCryptoKey;
  }
  throw new Error(`getKeyPairForKtyAndCrv does not support: ${kty} and ${crv}`);
};

// Maps a JWK (kty, crv, alg) to the [keySuite, jwsAlg] pair passed to jose-ld.
const jwaFor = (kty, crv, alg) => {
  if (kty === 'OKP' && crv === 'Ed25519') {
    return ['EdDsa', 'EdDSA'];
  }
  if (kty === 'EC' && crv === 'secp256k1') {
    return alg === 'ES256K-R'
      ? ['EcRecover', 'ES256K-R']
      : ['Ecdsa', 'ES256K'];
  }
  if (kty === 'EC' && crv === 'P-256') return ['Ecdsa', 'ES256'];
  if (kty === 'EC' && crv === 'P-384') return ['Ecdsa', 'ES384'];
  if (kty === 'EC' && crv === 'P-521') return ['Ecdsa', 'ES512'];
  return null;
};

const getKeyPairForType = (k) => {
  if (k.type === 'JsonWebKey2020') {
    return getKeyPairForKtyAndCrv(k.publicKeyJwk.kty, k.publicKeyJwk.crv);
  }
  if (k.type === 'Ed25519VerificationKey2018') {
    return Ed25519KeyPair;
  }
  if (k.type === 'EcdsaSecp256k1VerificationKey2019') {
    return Secp256k1KeyPair;
  }

  if (['P256Key2021', 'P384Key2021', 'P521Key2021'].includes(k.type)) {
    return WebCryptoKey;
  }

  throw new Error(`getKeyPairForType does not support type: ${k.type}`);
};

const getVerifier = async (k, options = { detached: true }) => {
  const { publicKeyJwk } = await k.export({ type: 'JsonWebKey2020' });
  const { kty, crv, alg } = publicKeyJwk;
  const jwa = jwaFor(kty, crv, alg);
  if (!jwa) {
    throw new Error(
      `getVerifier does not suppport ${JSON.stringify(publicKeyJwk, null, 2)}`,
    );
  }
  const [keySuite, jwsAlg] = jwa;
  return JWS.createVerifier(k.verifier(keySuite), jwsAlg, options);
};

const getSigner = async (k, options = { detached: true }) => {
  const { publicKeyJwk } = await k.export({ type: 'JsonWebKey2020' });
  const { kty, crv } = publicKeyJwk;
  const jwa = jwaFor(kty, crv, k.alg);
  if (!jwa) {
    throw new Error(
      `getSigner does not suppport ${JSON.stringify(publicKeyJwk, null, 2)}`,
    );
  }
  const [keySuite, jwsAlg] = jwa;
  return JWS.createSigner(k.signer(keySuite), jwsAlg, options);
};

const applyJwa = async (k, options) => {
  const verifier = await getVerifier(k, options);
  // eslint-disable-next-line no-param-reassign
  k.verifier = () => verifier;
  if (k.privateKey) {
    const signer = await getSigner(k, options);
    // eslint-disable-next-line no-param-reassign
    k.signer = () => signer;
  }
  return k;
};

const useJwa = async (k, options) => {
  // eslint-disable-next-line no-param-reassign
  k.useJwa = async (opts) => applyJwa(k, opts);
  return applyJwa(k, options);
};

export class JsonWebKey {
  static generate = async (
    options = {
      kty: 'OKP',
      crv: 'Ed25519',
      detached: true,
    },
  ) => {
    const KeyPair = getKeyPairForKtyAndCrv(options.kty, options.crv);
    if (!options.secureRandom) {
      // eslint-disable-next-line no-param-reassign
      options.secureRandom = () => crypto.randomBytes(32);
    }
    const kp = await KeyPair.generate({
      kty: options.kty,
      crvOrSize: options.crv,
      secureRandom: options.secureRandom,
    });
    const { detached } = options;
    return useJwa(kp, { detached });
  };

  static from = async (k, options = { detached: true }) => {
    const KeyPair = getKeyPairForType(k);
    const kp = await KeyPair.from(k);
    let { detached } = options;
    const { header } = options;
    if (detached === undefined) {
      detached = true;
    }
    return useJwa(kp, { detached, header });
  };
}
