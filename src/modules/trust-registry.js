import { typedHexDID } from '../utils/did';
import { getDidNonce } from '../utils/misc';

/**
 * `Trust Registry` module.
 */
export default class TrustRegistryModule {
  /**
   * Creates a new instance of `StatusListCredentialModule` and sets the api
   * @constructor
   * @param {object} api - PolkadotJS API Reference
   * @param signAndSend
   */
  constructor(api, signAndSend) {
    this.api = api;
    this.module = api.tx.trustRegistry;
    this.signAndSend = signAndSend;
  }

  /**
   * Initializes Trust Registry with the supplied parameters.
   * @param {*} convenerDid
   * @param {*} registryId
   * @param {*} name
   * @param {*} signingKeyRef
   * @param {*} params
   * @param {bool} waitForFinalization
   * @param {*} params
   * @returns {Promise<null>}
   */
  async init(
    convenerDid,
    registryId,
    name,
    signingKeyRef,
    { nonce = undefined, didModule = undefined } = {},
    waitForFinalization = true,
    params = {},
  ) {
    const convenerHexDid = typedHexDID(convenerDid);
    const lastNonce = nonce ?? await getDidNonce(convenerHexDid, nonce, didModule);

    return this.signAndSend(
      convenerHexDid.changeState(
        this.api,
        this.module.initTrustRegistry.bind(this.module),
        'InitTrustRegistry',
        { registryId, name, nonce: lastNonce },
        signingKeyRef,
      ),
      waitForFinalization,
      params,
    );
  }

  /**
   * Appends new schemas to the registry.
   * @param {*} convenerDid
   * @param {*} registryId
   * @param {*} schemas
   * @param {*} signingKeyRef
   * @param {*} params
   * @param {bool} waitForFinalization
   * @param {*} params
   * @returns {Promise<null>}
   */
  async addSchemaMetadata(
    convenerDid,
    registryId,
    schemas,
    signingKeyRef,
    { nonce = undefined, didModule = undefined } = {},
    waitForFinalization = true,
    params = {},
  ) {
    const convenerHexDid = typedHexDID(convenerDid);
    const lastNonce = nonce ?? await getDidNonce(convenerHexDid, nonce, didModule);

    return this.signAndSend(
      convenerHexDid.changeState(
        this.api,
        this.module.addSchemaMetadata,
        'AddSchemaMetadata',
        { registryId, schemas, nonce: lastNonce },
        signingKeyRef,
      ),
      waitForFinalization,
      params,
    );
  }

  /**
   * Updates schemas metadatas in the registry.
   * @param {*} convenerDid
   * @param {*} registryId
   * @param {*} schemas
   * @param {*} signingKeyRef
   * @param {*} params
   * @param {bool} waitForFinalization
   * @param {*} params
   * @returns {Promise<null>}
   */
  async updateSchemaMetadata(
    convenerOrIssuerOrVerifierDid,
    registryId,
    schemas,
    signingKeyRef,
    { nonce = undefined, didModule = undefined } = {},
    waitForFinalization = true,
    params = {},
  ) {
    const convenerOrIssuerOrVerifierHexDid = typedHexDID(convenerOrIssuerOrVerifierDid);
    const lastNonce = nonce ?? await getDidNonce(convenerOrIssuerOrVerifierHexDid, nonce, didModule);

    return this.signAndSend(
      convenerOrIssuerOrVerifierHexDid.changeState(
        this.api,
        this.module.updateSchemaMetadata,
        'UpdateSchemaMetadata',
        { registryId, schemas, nonce: lastNonce },
        signingKeyRef,
      ),
      waitForFinalization,
      params,
    );
  }
}
