import { TypedMap, option } from "@docknetwork/credential-sdk/types/generic";
import {
  u8aToString,
  withExtendedStaticProperties,
} from "@docknetwork/credential-sdk/utils";
import {
  CheqdParamsId,
  CheqdCreateResource,
} from "@docknetwork/credential-sdk/types";
import createInternalCheqdModule from "./create-internal-cheqd-module";

const methods = {
  addParams(id, params, did) {
    return new CheqdCreateResource(
      did.value.value,
      id,
      "1.0",
      [],
      this.constructor.ParamsName,
      this.constructor.ParamsType,
      this.constructor.Params.from(params).toJSONStringBytes()
    );
  },
};

export default function injectParams(klass) {
  const name = `withInternalParams(${klass.name})`;

  const obj = {
    [name]: class extends createInternalCheqdModule(methods, klass) {
      static get MsgNames() {
        const names = super.MsgNames ?? {};

        return {
          ...names,
          addParams: "MsgCreateResource",
        };
      }

      static get ParamsMap() {
        const { Params } = this;

        return class ParamsMap extends TypedMap {
          static KeyClass = CheqdParamsId;

          static ValueClass = Params;
        };
      }

      /**
       * Retrieves params by DID and counter.
       * @param {*} did
       * @param {*} counter
       * @returns {Promise<Params>}
       */
      async getParams(did, id) {
        const item = await this.resource(did, id);

        return option(this.constructor.Params).from(
          item && JSON.parse(u8aToString(item.resource.data))
        );
      }

      /**
       * Retrieves all params by a DID.
       * @param {*} did
       * @returns {Promise<Map<CheqdParamsId, Params>>}
       */
      async getAllParamsByDid(did) {
        const resources = await this.resourcesBy(
          did,
          this.filterParamsMetadata
        );

        return new this.constructor.ParamsMap(
          [...resources].map(([key, item]) => [
            key,
            JSON.parse(u8aToString(item.resource.data)),
          ])
        );
      }

      filterParamsMetadata(meta) {
        return meta.resourceType === this.constructor.ParamsType;
      }
    },
  };

  return withExtendedStaticProperties(
    ["Params", "ParamsName", "ParamsType"],
    obj[name]
  );
}
