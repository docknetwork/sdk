import {
  TypedNumber,
  option,
  withProp,
  TypedEnum,
  TypedMap,
  withNullIfNotAVariant,
} from "@docknetwork/credential-sdk/types/generic";
import { isEqualToOrPrototypeOf } from "@docknetwork/credential-sdk/utils";
import { createInternalDockModule } from "./builders";
import { DockDidOrDidMethodKey } from "@docknetwork/credential-sdk/types";

const didMethods = {
  addPublicKey(publicKey, targetDid, _, nonce) {
    return new this.constructor.PublicKeyAndParamsActions.AddPublicKey(
      this.constructor.PublicKey.from(publicKey),
      targetDid,
      nonce
    );
  },
  removePublicKey(keyId, targetDid, _, nonce) {
    const did = this.constructor.PublicKeyOwner.from(targetDid);

    return new this.constructor.PublicKeyAndParamsActions.RemovePublicKey(
      [did, keyId],
      did,
      nonce
    );
  },
};

export default function injectPublicKeys(klass) {
  const extended = createInternalDockModule({ didMethods }, klass);
  const name = `withPublicKeys(${extended.name})`;

  const obj = {
    [name]: class extends extended {
      static get PublicKeysMap() {
        const { PublicKey } = this;

        return class PublicKeyMap extends TypedMap {
          static KeyClass = TypedNumber;

          static ValueClass = PublicKey;
        };
      }

      async getPublicKey(did, keyId, includeParams = false) {
        const { PublicKey, ParamsRef, Params, PublicKeyOwner, PublicKeyQuery } =
          this.constructor;

        const PublicKeyWithParamsRef = withProp(
          PublicKey,
          "paramsRef",
          option(ParamsRef)
        );
        const PublicKeyWithParams = includeParams
          ? withProp(PublicKeyWithParamsRef, "params", option(Params))
          : PublicKeyWithParamsRef;
        const MaybeNotAVariantPublicKey =
          isEqualToOrPrototypeOf(TypedEnum, PublicKeyWithParams) &&
          PublicKeyWithParams.Class != null
            ? withNullIfNotAVariant(PublicKeyWithParams)
            : PublicKeyWithParams;
        const owner = PublicKeyOwner.from(did);
        const publicKey = option(MaybeNotAVariantPublicKey).from(
          await this.query[PublicKeyQuery](owner, TypedNumber.from(keyId))
        );

        if (publicKey == null) {
          return null;
        }

        if (includeParams && publicKey.paramsRef != null) {
          const params = await this.getParams(...publicKey.paramsRef);
          if (params == null) {
            throw new Error(
              `Parameters with reference (${publicKey.paramsRef[0]}, ${publicKey.paramsRef[1]}) not found on chain`
            );
          }
          publicKey.params = params;
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

        const keysCounter = await this.keysCounter(hexDid);
        for (let idx = 1; idx <= keysCounter; idx++) {
          // eslint-disable-next-line no-await-in-loop
          const publicKey = await this.getPublicKey(hexDid, idx, includeParams);

          if (publicKey != null) {
            publicKeysMap.set(idx, publicKey);
          }
        }

        return publicKeysMap;
      }
    },
  };

  return obj[name];
}
