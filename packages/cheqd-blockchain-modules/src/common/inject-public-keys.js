import { TypedMap, option } from "@docknetwork/credential-sdk/types/generic";
import {
  stringToU8a,
  maybeToJSONString,
  u8aToString,
  withExtendedStaticProperties,
  withExtendedPrototypeProperties,
} from "@docknetwork/credential-sdk/utils";
import {
  CheqdPublicKeyId,
  CheqdCreateResource,
} from "@docknetwork/credential-sdk/types";
import createInternalCheqdModule from "./create-internal-cheqd-module";

const methods = {
  addPublicKey(id, publicKey, did) {
    return new CheqdCreateResource(
      did.value.value,
      id,
      "1.0",
      [],
      this.constructor.PublicKeyName,
      this.constructor.PublicKeyType,
      this.constructor.PublicKey.from(publicKey).toJSONStringBytes()
    );
  },
};

export default function injectPublicKeys(klass) {
  const name = `withInternalPublicKeys(${klass.name})`;

  const obj = {
    [name]: class extends createInternalCheqdModule(methods, klass) {
      static get MsgNames() {
        const names = super.MsgNames ?? {};

        return {
          ...names,
          addPublicKey: "MsgCreateResource",
        };
      }

      static get PublicKeyMap() {
        const { PublicKey } = this;

        return class PublicKeyMap extends TypedMap {
          static KeyClass = CheqdPublicKeyId;

          static ValueClass = PublicKey;
        };
      }

      /**
       * Retrieves params by DID and counter.
       * @param {*} did
       * @param {*} counter
       * @returns {Promise<PublicKey>}
       */
      async getPublicKey(did, id) {
        const item = await this.resource(did, id);

        return option(this.constructor.PublicKey).from(
          item && JSON.parse(u8aToString(item.resource.data))
        );
      }

      /**
       * Retrieves all params by a DID.
       * @param {*} did
       * @returns {Promise<Map<CheqdPublicKeyId, PublicKey>>}
       */
      async getAllPublicKeyByDid(did) {
        const resources = await this.resourcesBy(
          did,
          this.filterPublicKeyMetadata
        );

        return new this.constructor.PublicKeyMap(
          [...resources].map(([key, item]) => [
            key,
            JSON.parse(u8aToString(item.resource.data)),
          ])
        );
      }

      filterPublicKeyMetadata(meta) {
        return meta.resourceType === this.constructor.PublicKeyType;
      }
    },
  };

  return withExtendedStaticProperties(
    ["PublicKey", "PublicKeyName", "PublicKeyType"],
    obj[name]
  );
}
