import { u8aToU8a } from '@polkadot/util';
import b58 from 'bs58';

/**
 * Defines commons for the `@docknetwork/crypto-wasm-ts` keypairs.
 */
export default class DockCryptoKeyPair {
  constructor(options, type) {
    this.type = type;
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
    return new this(options);
  }

  /**
   * Generate object with `sign` method
   * @param keypair
   * @param SecretKey
   * @param SignatureParams
   * @param Signature
   * @param DefaultLabelBytes
   * @param config
   * @returns {object}
   */
  static signerFactory(
    key,
    SecretKey,
    SignatureParams,
    Signature,
    DefaultLabelBytes,
    { preparePrivateKey = null } = {},
  ) {
    if (SecretKey == null) {
      throw new Error('No `SecretKey` provided');
    } else if (SignatureParams == null) {
      throw new Error('No `SignatureParams` provided');
    } else if (Signature == null) {
      throw new Error('No `Signature` provided');
    } else if (DefaultLabelBytes == null) {
      throw new Error('No `DefaultLabelBytes` provided');
    }
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
        const sigParams = SignatureParams.getSigParamsOfRequiredSize(
          msgCount,
          DefaultLabelBytes,
        );
        let sk = new SecretKey(u8aToU8a(key.privateKeyBuffer));
        if (preparePrivateKey != null) {
          sk = preparePrivateKey(sk, data);
        }
        const signature = Signature.generate(data, sk, sigParams, false);
        return signature.value;
      },
    };
  }

  /**
   * Generate object with `verify` method
   * @param key
   * @param PublicKey
   * @param SignatureParams
   * @param Signature
   * @param DefaultLabelBytes
   * @param config
   * @returns {object}
   */
  static verifierFactory(
    key,
    PublicKey,
    SignatureParams,
    Signature,
    DefaultLabelBytes,
    { preparePublicKey = null } = {},
  ) {
    if (PublicKey == null) {
      throw new Error('No `PublicKey` provided');
    } else if (SignatureParams == null) {
      throw new Error('No `SignatureParams` provided');
    } else if (Signature == null) {
      throw new Error('No `Signature` provided');
    }
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
      async verify({ data, signature: rawSignature }) {
        const msgCount = data.length;
        const sigParams = SignatureParams.getSigParamsOfRequiredSize(
          msgCount,
          DefaultLabelBytes,
        );
        const signature = new Signature(u8aToU8a(rawSignature));

        try {
          let pk = new PublicKey(u8aToU8a(key.publicKeyBuffer));
          if (preparePublicKey != null) {
            pk = preparePublicKey(pk, data);
          }
          const result = signature.verify(data, pk, sigParams, false);
          return result.verified;
        } catch (e) {
          console.error('crypto-wasm-ts error:', e);
          return false;
        }
      },
    };
  }

  /**
   * Returns a signer object for use with jsonld-signatures.
   *
   * @returns {{sign: Function}} A signer for the json-ld block.
   */
  signer() {
    return this.constructor.signerFactory(this);
  }

  /**
   * Returns a verifier object for use with jsonld-signatures.
   *
   * @returns {{verify: Function}} Used to verify jsonld-signatures.
   */
  verifier() {
    return this.constructor.verifierFactory(this);
  }
}
