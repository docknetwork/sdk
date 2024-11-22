import {
  TypedNumber,
  option,
  withProp,
  TypedEnum,
  TypedMap,
  withNullIfNotAVariant,
} from '@docknetwork/credential-sdk/types/generic';
import { isEqualToOrPrototypeOf, withExtendedStaticProperties, withExtendedPrototypeProperties } from '@docknetwork/credential-sdk/utils';
import { DockDidOrDidMethodKey } from '@docknetwork/credential-sdk/types';
import { createInternalDockModule } from './builders';

const didMethods = {
  addPublicKey(publicKey, targetDid, _, nonce) {
    return new this.constructor.PublicKeyAndParamsActions.AddPublicKey(
      this.constructor.PublicKey.from(publicKey),
      targetDid,
      nonce,
    );
  },
  removePublicKey(keyId, targetDid, _, nonce) {
    const did = this.constructor.PublicKeyOwner.from(targetDid);

    return new this.constructor.PublicKeyAndParamsActions.RemovePublicKey(
      [did, keyId],
      did,
      nonce,
    );
  },
};

export default function injectPublicKeys(klass) {
  const name = `withInternalPublicKeys(${klass.name})`;

  const obj = {
    [name]: class extends klass {
      static get PublicKeysMap() {
        const { PublicKey } = this;

        return class PublicKeyMap extends TypedMap {
          static KeyClass = TypedNumber;

          static ValueClass = PublicKey;
        };
      }

      async getPublicKey(did, keyId, includeParams = false) {
        const {
          PublicKey, ParamsRef, PublicKeyOwner, PublicKeyQuery,
        } = this.constructor;

        const PublicKeyWithParamsRef = withProp(
          PublicKey,
          'paramsRef',
          option(ParamsRef),
        );
        const MaybeNotAVariantPublicKey = isEqualToOrPrototypeOf(TypedEnum, PublicKeyWithParamsRef)
          && PublicKeyWithParamsRef.Class != null
          ? withNullIfNotAVariant(PublicKeyWithParamsRef)
          : PublicKeyWithParamsRef;

        const owner = PublicKeyOwner.from(did);
        const publicKey = option(MaybeNotAVariantPublicKey).from(
          await this.query[PublicKeyQuery](owner, TypedNumber.from(keyId)),
        );

        if (publicKey == null) {
          return null;
        }

        if (includeParams) {
          return await publicKey.withParams(this);
        }

        return publicKey;
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

        const keysCounter = await this.lastPublicKeyId(hexDid);
        for (let idx = 1; idx <= keysCounter; idx++) {
          // eslint-disable-next-line no-await-in-loop
          const publicKey = await this.getPublicKey(hexDid, idx, includeParams);

          if (publicKey != null) {
            publicKeysMap.set(idx, publicKey);
          }
        }

        return publicKeysMap;
      }

      async lastPublicKeyId(_did) {
        throw new Error('Unimplemented');
      }
    },
  };

  return createInternalDockModule(
    { didMethods },
    withExtendedPrototypeProperties(['lastPublicKeyId'], withExtendedStaticProperties(
      ['PublicKey', 'ParamsRef', 'PublicKeyOwner', 'PublicKeyQuery'],
      obj[name],
    )),
  );
}
