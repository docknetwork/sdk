import { u8aToU8a } from '@polkadot/util';
import b58 from 'bs58';

import {
  PSKeypair,
  PSSignature,
  PSPublicKey,
  PSSecretKey,
  PSSignatureParams,
} from '@docknetwork/crypto-wasm-ts';

import {
  SIGNATURE_PARAMS_LABEL_BYTES,
} from '@docknetwork/crypto-wasm-ts/lib/anonymous-credentials';

import { Bls12381PSDockVerKeyName } from './constants';

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
      const sigParams = PSSignatureParams.getSigParamsOfRequiredSize(msgCount, SIGNATURE_PARAMS_LABEL_BYTES);
      const signature = PSSignature.generate(data, new PSSecretKey(u8aToU8a(key.privateKeyBuffer)), sigParams, false);
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
      const sigParams = PSSignatureParams.getSigParamsOfRequiredSize(msgCount, SIGNATURE_PARAMS_LABEL_BYTES);
      const bbsSignature = new PSSignature(u8aToU8a(signature));

      try {
        const result = bbsSignature.verify(data, new PSPublicKey(u8aToU8a(key.publicKeyBuffer)), sigParams, false);
        return result.verified;
      } catch (e) {
        console.error('crypto-wasm-ts error:', e);
        return false;
      }
    },
  };
};

export default class Bls12381PSKeyPairDock2023 {
  constructor(options) {
    this.type = Bls12381PSDockVerKeyName;
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
    return new Bls12381PSKeyPairDock2023(options);
  }

  static generate({
    seed, params, controller, id, msgCount = 1
  } = {}) {
    const keypair = PSKeypair.generate(params || PSSignatureParams.getSigParamsOfRequiredSize(msgCount, SIGNATURE_PARAMS_LABEL_BYTES), seed);
    return new Bls12381PSKeyPairDock2023({ keypair, controller, id });
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
