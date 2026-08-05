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
  if (kty === 'OKP') {
    if (crv === 'Ed25519') {
      return Ed25519KeyPair;
    }
  }
  if (kty === 'EC') {
    if (crv === 'secp256k1') {
      return Secp256k1KeyPair;
    }

    if (['P-256', 'P-384', 'P-521'].includes(crv)) {
      return WebCryptoKey;
    }
  }
  throw new Error(`getKeyPairForKtyAndCrv does not support: ${kty} and ${crv}`);
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
  if (kty === 'OKP') {
    if (crv === 'Ed25519') {
      return JWS.createVerifier(k.verifier('EdDsa'), 'EdDSA', options);
    }
  }

  if (kty === 'EC') {
    if (crv === 'secp256k1') {
      if (alg && alg === 'ES256K-R') {
        return JWS.createVerifier(k.verifier('EcRecover'), 'ES256K-R', options);
      }
      return JWS.createVerifier(k.verifier('Ecdsa'), 'ES256K', options);
    }

    if (crv === 'P-256') {
      return JWS.createVerifier(k.verifier('Ecdsa'), 'ES256', options);
    }
    if (crv === 'P-384') {
      return JWS.createVerifier(k.verifier('Ecdsa'), 'ES384', options);
    }
    if (crv === 'P-521') {
      return JWS.createVerifier(k.verifier('Ecdsa'), 'ES512', options);
    }
  }

  throw new Error(
    `getVerifier does not suppport ${JSON.stringify(publicKeyJwk, null, 2)}`,
  );
};

const getSigner = async (k, options = { detached: true }) => {
  const { publicKeyJwk } = await k.export({ type: 'JsonWebKey2020' });
  const { kty, crv } = publicKeyJwk;
  const { alg } = k;
  if (kty === 'OKP') {
    if (crv === 'Ed25519') {
      return JWS.createSigner(k.signer('EdDsa'), 'EdDSA', options);
    }
  }
  if (kty === 'EC') {
    if (crv === 'secp256k1') {
      if (alg && alg === 'ES256K-R') {
        return JWS.createSigner(k.signer('EcRecover'), 'ES256K-R', options);
      }
      return JWS.createSigner(k.signer('Ecdsa'), 'ES256K', options);
    }
    if (crv === 'P-256') {
      return JWS.createSigner(k.signer('Ecdsa'), 'ES256', options);
    }
    if (crv === 'P-384') {
      return JWS.createSigner(k.signer('Ecdsa'), 'ES384', options);
    }
    if (crv === 'P-521') {
      return JWS.createSigner(k.signer('Ecdsa'), 'ES512', options);
    }
  }
  throw new Error(
    `getSigner does not suppport ${JSON.stringify(publicKeyJwk, null, 2)}`,
  );
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
