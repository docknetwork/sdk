import { AbstractWithParamsAndPublicKeys } from '@docknetwork/credential-sdk/modules/common';
import {
  TypedNumber,
  option,
  withProp,
  TypedMap,
  TypedEnum,
  withNullIfNotAVariant,
} from '@docknetwork/credential-sdk/types/generic';
import { DockDidOrDidMethodKey } from '@docknetwork/credential-sdk/types';
import {
  isEqualToOrPrototypeOf,
  withExtendedStaticProperties,
} from '@docknetwork/credential-sdk/utils/inheritance';
import injectDock from './inject-dock';

/**
 * Wraps supplied class into a class with logic for public keys and corresponding setup parameters.
 */
/* eslint-disable sonarjs/cognitive-complexity */
export default function withParamsAndPublicKeys(klass) {
  const name = `withParamsAndPublicKeys(${klass.name})`;

  if (!isEqualToOrPrototypeOf(AbstractWithParamsAndPublicKeys, klass)) {
    throw new Error(
      `Class \`${klass.name}\` must extend \`${AbstractWithParamsAndPublicKeys}\``,
    );
  }

  const obj = {
    [name]: class extends injectDock(klass) {
      static get ParamsMap() {
        const { Params } = this;

        return class ParamsMap extends TypedMap {
          static KeyClass = TypedNumber;

          static ValueClass = Params;
        };
      }

      static get PublicKeysMap() {
        const { PublicKey } = this;

        return class PublicKeyMap extends TypedMap {
          static KeyClass = TypedNumber;

          static ValueClass = PublicKey;
        };
      }

      /**
       * Builds module-specific params from the provided value.
       */
      static get Params() {
        return this.DockOnly.Params;
      }

      /**
       * Owner of a public key.
       */
      static get PublicKeyOwner() {
        return this.DockOnly.PublicKeyOwner;
      }

      /**
       * Builds module-specific public key from the provided value.
       */
      static get PublicKey() {
        return this.DockOnly.PublicKey;
      }

      static get ParamsQuery() {
        return this.DockOnly.ParamsQuery;
      }

      static get PublicKeyQuery() {
        return this.DockOnly.PublicKeyQuery;
      }

      /**
       * Add new signature params.
       * @param param - The signature params to add.
       * @param didKeypair - The signer DID's keypair

       * @returns {Promise<*>}
       */
      async addParamsTx(id, param, targetDid, didKeypair) {
        return await this.dockOnly.tx.addParams(param, targetDid, didKeypair);
      }

      /**
       * Remove existing BBS+ params.
       * @param index - Identifier of the params to be removed
       * @param didKeypair - Signer DID's keypair

       * @returns {Promise<*>}
       */
      async removeParamsTx(id, targetDid, didKeypair) {
        return await this.dockOnly.tx.removeParams(id, targetDid, didKeypair);
      }

      /**
       * Add a public key
       * @param publicKey - public key to add.
       * @param targetDid - The DID to which key is being added
       * @param didKeypair - Signer's didKeypair
       * @returns {Promise<*>}
       */
      async addPublicKeyTx(_id, publicKey, targetDid, didKeypair) {
        return await this.dockOnly.tx.addPublicKey(
          publicKey,
          targetDid,
          didKeypair,
        );
      }

      /**
       * Remove public key
       * @param removeKeyId - Identifier of the public key to be removed.
       * @param targetDid - The DID from which key is being removed
       * @param didKeypair - Signer's signing key reference
       * @returns {Promise<*>}
       */
      async removePublicKeyTx(id, targetDid, didKeypair) {
        return await this.dockOnly.tx.removePublicKey(
          id,
          targetDid,
          didKeypair,
        );
      }

      /**
       * Retrieves params by DID and counter.
       * @param {*} did
       * @param {*} counter
       * @returns {Promise<Params>}
       */
      async getParams(did, counter) {
        return option(this.constructor.Params).from(
          await this.dockOnly.query[this.constructor.ParamsQuery](
            DockDidOrDidMethodKey.from(did),
            TypedNumber.from(counter),
          ),
        );
      }

      /**
       * Retrieves all params by a DID.
       * @param {*} did
       * @returns {Promise<Map<TypedNumber, Params>>}
       */
      async getAllParamsByDid(did) {
        // TODO: use `multi`
        const hexDid = DockDidOrDidMethodKey.from(did);
        const paramsMap = new this.constructor.ParamsMap();

        const paramsCounter = await this.dockOnly.paramsCounter(hexDid);
        for (let idx = 1; idx <= paramsCounter; idx++) {
          // eslint-disable-next-line no-await-in-loop
          const params = await this.getParams(hexDid, idx);

          if (params != null) {
            paramsMap.set(idx, params);
          }
        }

        return paramsMap;
      }

      /**
       * Retrieves all public keys by a DID.
       * @param {*} did
       * @returns {Promise<Map<TypedNumber, PublicKey>>}
       */
      async getAllPublicKeysByDid(did, includeParams) {
        // TODO: use `multi`
        const hexDid = DockDidOrDidMethodKey.from(did);
        const publicKeysMap = new this.constructor.PublicKeysMap();

        const keysCounter = await this.dockOnly.keysCounter(hexDid);
        for (let idx = 1; idx <= keysCounter; idx++) {
          // eslint-disable-next-line no-await-in-loop
          const publicKey = await this.getPublicKey(hexDid, idx, includeParams);

          if (publicKey != null) {
            publicKeysMap.set(idx, publicKey);
          }
        }

        return publicKeysMap;
      }

      /**
       *
       * @param did
       * @param keyId
       * @param withParams - If true, return the params referenced by the public key. It will throw an error if paramsRef is null
       * or params were not found on chain which can happen if they were deleted after this public key was added.
       * @returns {Promise<{bytes: string}|null>}
       */
      async getPublicKey(did, keyId, includeParams = false) {
        const {
          PublicKey, ParamsRef, Params, PublicKeyOwner, PublicKeyQuery,
        } = this.constructor;

        const PublicKeyWithParamsRef = withProp(
          PublicKey,
          'paramsRef',
          option(ParamsRef),
        );
        const PublicKeyWithParams = includeParams
          ? withProp(PublicKeyWithParamsRef, 'params', option(Params))
          : PublicKeyWithParamsRef;
        const MaybeNotAVariantPublicKey = isEqualToOrPrototypeOf(TypedEnum, PublicKeyWithParams)
          && PublicKeyWithParams.Class != null
          ? withNullIfNotAVariant(PublicKeyWithParams)
          : PublicKeyWithParams;
        const owner = PublicKeyOwner.from(did);
        const publicKey = await option(MaybeNotAVariantPublicKey).from(
          await this.dockOnly.query[PublicKeyQuery](
            owner,
            TypedNumber.from(keyId),
          ),
        );

        if (publicKey == null) {
          return null;
        }

        if (includeParams && publicKey.paramsRef != null) {
          const params = await this.getParams(...publicKey.paramsRef);
          if (params == null) {
            throw new Error(
              `Parameters with reference (${publicKey.paramsRef[0]}, ${publicKey.paramsRef[1]}) not found on chain`,
            );
          }
          publicKey.params = params;
        }

        return publicKey;
      }
    },
  };

  return withExtendedStaticProperties(['ParamsRef'], obj[name]);
}
