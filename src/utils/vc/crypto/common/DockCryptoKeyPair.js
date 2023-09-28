import { u8aToU8a } from '@polkadot/util';
import b58 from 'bs58';
import { withExtendedStaticProperties } from '../../../inheritance';

/**
 * Defines commons for the `@docknetwork/crypto-wasm-ts` keypairs.
 */
export default withExtendedStaticProperties(
  [
    'KeyPair',
    'PublicKey',
    'SecretKey',
    'SignatureParams',
    'Signature',
    'defaultLabelBytes',
  ],
  class DockCryptoKeyPair {
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
     * Generates new keypair using provided options.
     *
     * @param options
     * @param options.seed
     * @param options.params
     * @param options.controller
     * @param options.id
     * @param options.msgCount
     */
    static generate({
      seed, params, controller, id, msgCount = 1,
    } = {}) {
      const keypair = this.KeyPair.generate(
        params
          || this.SignatureParams.getSigParamsOfRequiredSize(
            msgCount,
            this.defaultLabelBytes,
          ),
        seed,
      );
      return new this({ keypair, controller, id });
    }

    /**
     * Generate object with `sign` method
     * @param keypair
     * @returns {object}
     */
    static signerFactory(key) {
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
      const {
        SecretKey,
        SignatureParams,
        Signature,
        defaultLabelBytes,
      } = this;
      const keypairClass = this;

      return {
        async sign({ data }) {
          const msgCount = data.length;
          const sigParams = SignatureParams.getSigParamsOfRequiredSize(
            msgCount,
            defaultLabelBytes,
          );
          const sk = keypairClass.adaptKey(
            new SecretKey(u8aToU8a(key.privateKeyBuffer)),
            data.length,
          );
          const signature = Signature.generate(data, sk, sigParams, false);
          return signature.value;
        },
      };
    }

    /**
     * Generate object with `verify` method
     * @param keypair
     * @returns {object}
     */
    static verifierFactory(keypair) {
      if (!keypair.id) {
        return {
          async sign() {
            throw new Error('No key ID for the label.');
          },
        };
      }
      if (!keypair.publicKeyBuffer) {
        return {
          async verify() {
            throw new Error('No public key to verify with.');
          },
        };
      }

      const {
        PublicKey, Signature, SignatureParams, defaultLabelBytes,
      } = this;
      const keypairClass = this;

      return {
        async verify({ data, signature: rawSignature }) {
          const msgCount = data.length;
          const sigParams = SignatureParams.getSigParamsOfRequiredSize(
            msgCount,
            defaultLabelBytes,
          );
          const signature = new Signature(u8aToU8a(rawSignature));

          try {
            const pk = keypairClass.adaptKey(
              new PublicKey(u8aToU8a(keypair.publicKeyBuffer)),
              data.length,
            );
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
     * Adapts the provided public or secret key for the given message count.
     * @param {*} key
     * @param {*} _msgCount
     */
    static adaptKey(key, _msgCount) {
      return key;
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
  },
);
