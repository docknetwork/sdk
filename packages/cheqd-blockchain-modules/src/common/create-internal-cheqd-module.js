import { ensureInstanceOf } from '@docknetwork/credential-sdk/utils';
import { TypedUUID } from '@docknetwork/credential-sdk/types/generic';
import { AbstractApiProvider } from '@docknetwork/credential-sdk/modules/abstract';

/**
 * Creates a transaction constructor for DID operations.
 * This function generates an async method that constructs and signs transactions
 * for DID-related operations, handling payload creation, signing, and resource construction.
 *
 * @param {string} fnName - The name of the function to create as a transaction constructor
 * @returns {Function} An async function that handles DID transaction construction
 */
const createDIDMethodTx = (fnName) => {
  const obj = {
    async [fnName](...args) {
      const { root } = this;

      const [didKeypairs] = args.slice(-1);

      const payload = root.payload[fnName].apply(this.root, args);
      const bytes = await root.apiProvider.stateChangeBytes(
        root.constructor.MsgNames[fnName],
        payload,
      );

      const signatures = []
        .concat(didKeypairs)
        .map((didKeypair) => root.types.VerificationMethodSignature.fromDidKeypair(
          didKeypair,
          bytes,
        ));

      const value = {
        payload,
        signatures,
      };

      return new payload.constructor.ResourcePayloadWithTypeUrlAndSignatures(
        root.constructor.MsgNames[fnName],
        value,
      );
    },
  };

  return obj[fnName];
};

/**
 * Creates an async function for handling module calls.
 * This function generates a method that constructs transactions and sends them
 * through the API provider, handling argument slicing and transaction sending.
 *
 * @param {string} fnName - The name of the function to create as a call handler
 * @returns {Function} An async function that handles transaction construction and sending
 */
const createCall = (fnName) => {
  const obj = {
    async [fnName](...args) {
      const { root } = this;
      const tx = await root.tx[fnName](
        ...args.slice(0, root.payload[fnName].length),
      );

      return await root.signAndSend(tx, args[root.payload[fnName].length]);
    },
  };

  return obj[fnName];
};

/**
 * Filters out specific resource-related errors and returns a placeholder on failure.
 * This function catches errors related to missing resources and returns a placeholder
 * instead of throwing an error. Useful for handling cases where resources may not exist.
 *
 * @param {Promise} promise - The promise to await and filter errors from
 * @param {*} placeholder - The value to return if an error is filtered
 * @returns {*} Either the resolved promise or the placeholder
 */
const filterNoResourceError = async (promise, placeholder) => {
  try {
    return await promise;
  } catch (err) {
    if (!String(err).includes('not found')) {
      throw err;
    }
  }

  return placeholder;
};

/**
 * Empty root class used as a base for payload, module, and sender classes.
 */
class Root {
  constructor(root) {
    this.root = root;
  }
}

/* eslint-disable sonarjs/cognitive-complexity */
export default function createInternalCheqdModule(
  methods = Object.create(null),
  baseClass = class CheqdModuleBaseClass {},
) {
  const name = `internalCheqdModule(${baseClass.name})`;

  const obj = {
    [name]: class extends baseClass {
      /**
       * Root payload handling class
       * @class
       * @extends {Root}
       */
      static RootPayload = class RootPayload extends (baseClass.RootPayload
        ?? Root) {};

      /**
       * Root module handling class
       * @class
       * @extends {Root}
       */
      static RootModule = class RootModule extends (baseClass.RootModule
        ?? Root) {};

      /**
       * Root sender handling class
       * @class
       * @extends {Root}
       */
      static RootSender = class RootSender extends (baseClass.RootSender
        ?? Root) {};

      constructor(apiProvider) {
        super(apiProvider);

        this.apiProvider = ensureInstanceOf(apiProvider, AbstractApiProvider);
      }

      /**
       * Gets the types instance from the API provider
       * @readonly
       * @memberof module:internalCheqdModule
       */
      get types() {
        return this.apiProvider.types();
      }

      /**
       * Fetches multiple resources by their IDs
       * @param {string} did - The DID identifier
       * @param {string[]} ids - Array of resource IDs to fetch
       * @returns {Promise<Map<string, any>>} A map of resource IDs to their corresponding resources
       */
      async resources(did, ids) {
        const strDid = this.types.Did.from(did).toEncodedString();

        const queries = [...ids].map(async (id) => [
          id,
          await this.apiProvider.sdk.querier.resource.resource(strDid, id),
        ]);

        return new Map(await Promise.all(queries));
      }

      /**
       * Fetches resources based on a condition
       * @param {string} did - The DID identifier
       * @param {Function} cond - Filtering function to determine which metadata to include
       * @returns {Promise<Map<string, any>>} A map of resource IDs to their corresponding resources
       */
      async resourcesBy(did, cond) {
        const metas = await this.resourcesMetadataBy(did, cond);

        return await this.resources(
          did,
          metas.map((meta) => meta.id),
        );
      }

      /**
       * Fetches a single resource by ID and DID
       * @param {string} did - The DID identifier
       * @param {string} id - The resource ID
       * @returns {any|null} The fetched resource or null if not found
       */
      async resource(did, id) {
        const strDid = this.types.Did.from(did).toEncodedString();
        const strID = String(TypedUUID.from(id));

        return await filterNoResourceError(
          this.apiProvider.sdk.querier.resource.resource(strDid, strID),
          null,
        );
      }

      /**
       * Fetches resource metadata based on a condition with pagination support
       * @param {string} did - The DID identifier
       * @param {Function} cond - Filtering function to determine which metadata to include
       * @param {Function} [stop] - Function determining when to stop fetching pages
       * @returns {Promise<Array<Object>>} Array of resource metadata matching the condition
       */
      async resourcesMetadataBy(did, cond, stop = (_) => false) {
        let res = [];
        let resources;
        let paginationKey;
        const encodedDid = this.types.Did.from(did).toEncodedString();

        do {
          // eslint-disable-next-line no-await-in-loop
          ({ resources, paginationKey } = await filterNoResourceError(
            this.apiProvider.sdk.querier.resource.collectionResources(
              encodedDid,
              paginationKey,
            ),
            { resources: [], paginationKey: null },
          ));

          res = res.concat(resources.filter(cond));
        } while (!stop(res) && paginationKey != null);

        return res;
      }

      /**
       * Fetches the latest resource metadata based on a condition
       * @param {string} did - The DID identifier
       * @param {Function} cond - Filtering function to determine which metadata to include
       * @returns {Array<Object>} Array of latest resource metadata matching the condition
       */
      async latestResourcesMetadataBy(did, cond) {
        return await this.resourcesMetadataBy(
          did,
          (meta) => cond(meta) && !meta.nextVersionId,
        );
      }

      /**
       * Fetches the first matching latest resource metadata based on a condition
       * @param {string} did - The DID identifier
       * @param {Function} cond - Filtering function to determine which metadata to include
       * @returns {Promise<Object|null>} The first matching metadata or null if none found
       */
      async latestResourceMetadataBy(did, cond) {
        const meta = await this.resourcesMetadataBy(
          did,
          (item) => cond(item) && !item.nextVersionId,
          (res) => res.length,
        );

        return meta[0] ?? null;
      }

      /**
       * Accessor for transaction handling methods
       * @readonly
       * @memberof module:internalCheqdModule
       */
      get tx() {
        return new this.constructor.RootModule(this);
      }

      /**
       * Accessor for sending methods
       * @readonly
       * @memberof module:internalCheqdModule
       */
      get send() {
        return new this.constructor.RootSender(this);
      }

      /**
       * Accessor for payload handling methods
       * @readonly
       * @memberof module:internalCheqdModule
       */
      get payload() {
        return new this.constructor.RootPayload(this);
      }

      /**
       * Signs and sends a transaction through the API provider
       * @param {Object} extrinsic - The extrinsic to sign and send
       * @param {Object} [params] - Additional parameters for signing
       * @returns {Promise<*>} The result of sending the signed transaction
       */
      async signAndSend(extrinsic, params) {
        return await this.apiProvider.signAndSend(extrinsic, params);
      }
    },
  };

  for (const [key, payload] of Object.entries(methods)) {
    obj[name].RootPayload.prototype[key] = payload;
    obj[name].RootModule.prototype[key] = createDIDMethodTx(key);
    obj[name].RootSender.prototype[key] = createCall(key);
  }

  return obj[name];
}
