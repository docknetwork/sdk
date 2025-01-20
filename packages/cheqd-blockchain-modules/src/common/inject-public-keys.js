import { TypedMap, TypedUUID } from "@docknetwork/credential-sdk/types/generic";
import {
  u8aToString,
  withExtendedStaticProperties,
} from "@docknetwork/credential-sdk/utils";
import { CheqdCreateResource } from "@docknetwork/credential-sdk/types";
import createInternalCheqdModule from "./create-internal-cheqd-module";
import { validateResource } from "./resource";

const methods = {
  addPublicKey(id, publicKey, did) {
    return new CheqdCreateResource(
      this.types.Did.from(did).value.value,
      TypedUUID.from(id),
      "1.0",
      [],
      this.constructor.PublicKeyName,
      this.constructor.PublicKeyType,
      this.PublicKey.from(publicKey).toJSONStringBytes()
    );
  },
};

export default function injectPublicKeys(klass) {
  const name = `withInternalPublicKeys(${klass.name})`;

  const obj = {
    [name]: class extends createInternalCheqdModule(methods, klass) {
      constructor(...args) {
        super(...args);

        this.filterPublicKeyMetadata = this.filterPublicKeyMetadata.bind(this);
      }

      get PublicKeysMap() {
        const { PublicKey, constructor } = this;
        const { PublicKeyId } = constructor;

        return class PublicKeysMap extends TypedMap {
          static KeyClass = PublicKeyId;

          static ValueClass = PublicKey;
        };
      }

      static get MsgNames() {
        const names = super.MsgNames ?? {};

        return {
          ...names,
          addPublicKey: "MsgCreateResource",
        };
      }

      /**
       * Retrieves params by DID and identifier.
       * @param {*} did
       * @param {*} id
       * @param {boolean} [includeParams=false]
       * @returns {Promise<PublicKey>}
       */
      async getPublicKey(did, id, includeParams = false) {
        const { PublicKey, constructor } = this;
        const { PublicKeyType, PublicKeyName, PublicKeyId } = constructor;

        const item = await this.resource(did, PublicKeyId.from(id));
        if (item == null) {
          return null;
        }

        const publicKey = PublicKey.from(
          JSON.parse(
            u8aToString(validateResource(item, PublicKeyName, PublicKeyType))
          )
        );
        if (includeParams) {
          return await publicKey.withParams(this);
        } else {
          return publicKey;
        }
      }

      /**
       * Retrieves all public keys by a DID.
       * @param {*} did
       * @param {boolean} [includeParams=false]
       * @returns {Promise<Map<CheqdPublicKeyId, PublicKey>>}
       */
      async getAllPublicKeysByDid(did, includeParams = false) {
        const { PublicKeysMap } = this;

        const metas = await this.resourcesMetadataBy(
          did,
          this.filterPublicKeyMetadata
        );

        return new PublicKeysMap(
          await Promise.all(
            metas.map(async ({ id }) => [
              id,
              await this.getPublicKey(did, id, includeParams),
            ])
          )
        );
      }

      filterPublicKeyMetadata(meta) {
        return meta.resourceType === this.constructor.PublicKeyType;
      }
    },
  };

  return withExtendedStaticProperties(
    ["PublicKeyName", "PublicKeyType"],
    obj[name]
  );
}
