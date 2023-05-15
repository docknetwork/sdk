import { u8aToU8a } from '@polkadot/util';
import b58 from 'bs58';

import {
  BBSKeypair,
  BBSSignature,
  BBSPublicKey,
  BBSSecretKey,
  BBSSignatureParams,
} from '@docknetwork/crypto-wasm-ts';

import {
  BBS_SIGNATURE_PARAMS_LABEL_BYTES,
} from '@docknetwork/crypto-wasm-ts/lib/anonymous-credentials';

import { Bls12381BBS23DockVerKeyName } from './constants';

const signerFactory = (key) => {
  if (!key.id) {
    return {
      async sign() {
        throw new Error('No key ID for the label.');
      },
    };
  }
  if (!key.privateKeyBuffer) {
    return {
      async sign() {
        throw new Error('No private key to sign with.');
      },
    };
  }
  return {
    async sign({ data }) {
      const msgCount = data.length;
      const sigParams = BBSSignatureParams.getSigParamsOfRequiredSize(msgCount, BBS_SIGNATURE_PARAMS_LABEL_BYTES);
      const signature = BBSSignature.generate(data, new BBSSecretKey(u8aToU8a(key.privateKeyBuffer)), sigParams, false);
      return signature.value;
    },
  };
};

const verifierFactory = (key) => {
  if (!key.id) {
    return {
      async sign() {
        throw new Error('No key ID for the label.');
      },
    };
  }
  if (!key.publicKeyBuffer) {
    return {
      async verify() {
        throw new Error('No public key to verify with.');
      },
    };
  }

  return {
    async verify({ data, signature }) {
      const msgCount = data.length;
      const sigParams = BBSSignatureParams.getSigParamsOfRequiredSize(msgCount, BBS_SIGNATURE_PARAMS_LABEL_BYTES);
      const bbsSignature = new BBSSignature(u8aToU8a(signature));

      try {
        const result = bbsSignature.verify(data, new BBSPublicKey(u8aToU8a(key.publicKeyBuffer)), sigParams, false);
        return result.verified;
      } catch (e) {
        console.error('crypto-wasm-ts error:', e);
        return false;
      }
    },
  };
};

export default class Bls12381BBSKeyPairDock2023 {
  constructor(options) {
    this.type = Bls12381BBS23DockVerKeyName;
    this.id = options.id;
    this.controller = options.controller;

    const { keypair } = options;

    if (keypair) {
      this.privateKeyBuffer = keypair.sk.value;
      this.publicKeyBuffer = keypair.pk.value;
    } else {
      this.privateKeyBuffer = options.privateKeyBase58
        ? b58.decode(options.privateKeyBase58)
        : undefined;
      this.publicKeyBuffer = b58.decode(options.publicKeyBase58);
    }
  }

  static async from(options) {
    return new Bls12381BBSKeyPairDock2023(options);
  }

  static generate({
    seed, params, controller, id, msgCount = 1,
  } = {}) {
    const keypair = BBSKeypair.generate(params || BBSSignatureParams.getSigParamsOfRequiredSize(msgCount, BBS_SIGNATURE_PARAMS_LABEL_BYTES), seed);
    return new Bls12381BBSKeyPairDock2023({ keypair, controller, id });
  }

  /**
   * Returns a signer object for use with jsonld-signatures.
   *
   * @returns {{sign: Function}} A signer for the json-ld block.
   */
  signer() {
    return signerFactory(this);
  }

  /**
   * Returns a verifier object for use with jsonld-signatures.
   *
   * @returns {{verify: Function}} Used to verify jsonld-signatures.
   */
  verifier() {
    return verifierFactory(this);
  }
}
