import { BTreeSet } from '@polkadot/types';
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
   * @param convenerDid
   * @param registryId
   * @param name
   * @param govFramework
   * @param signingKeyRef
   * @param nonce
   * @param didModule
   * @param params
   * @param waitForFinalization
   * @param params
   * @returns {Promise<null>}
   */
  async initOrUpdate(
    convenerDid,
    registryId,
    name,
    govFramework,
    signingKeyRef,
    { nonce = undefined, didModule = undefined } = {},
    waitForFinalization = true,
    params = {},
  ) {
    const [convenerHexDid, lastNonce] = await this.getActorDidAndNonce(convenerDid, { nonce, didModule });

    return this.signAndSend(
      convenerHexDid.changeState(
        this.api,
        this.module.initOrUpdateTrustRegistry,
        'InitOrUpdateTrustRegistry',
        {
          registryId,
          name,
          govFramework,
          nonce: lastNonce,
        },
        signingKeyRef,
      ),
      waitForFinalization,
      params,
    );
  }

  /**
   * Appends new schemas to the registry.
   * @param convenerDid
   * @param registryId
   * @param schemas
   * @param signingKeyRef
   * @param nonce
   * @param didModule
   * @param params
   * @param waitForFinalization
   * @param params
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
    const [convenerHexDid, lastNonce] = await this.getActorDidAndNonce(convenerDid, { nonce, didModule });

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
   * @param convenerOrIssuerOrVerifierDid
   * @param registryId
   * @param schemas
   * @param signingKeyRef
   * @param nonce
   * @param didModule
   * @param params
   * @param waitForFinalization
   * @param params
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
    const [convenerOrIssuerOrVerifierHexDid, lastNonce] = await this.getActorDidAndNonce(convenerOrIssuerOrVerifierDid, { nonce, didModule });

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

  /**
   * Suspends issuers in the registry.
   * @param convenerDid
   * @param registryId
   * @param issuers
   * @param signingKeyRef
   * @param nonce
   * @param didModule
   * @param params
   * @param waitForFinalization
   * @param params
   * @returns {Promise<null>}
   */
  async suspendIssuers(
    convenerDid,
    registryId,
    issuers,
    signingKeyRef,
    { nonce = undefined, didModule = undefined } = {},
    waitForFinalization = true,
    params = {},
  ) {
    const [convenerHexDid, lastNonce] = await this.getActorDidAndNonce(convenerDid, { nonce, didModule });

    const hexIssuers = new BTreeSet();
    for (const issuer of issuers) {
      hexIssuers.add(typedHexDID(this.api, issuer));
    }

    return this.signAndSend(
      convenerHexDid.changeState(
        this.api,
        this.module.suspendIssuers,
        'SuspendIssuers',
        { registryId, issuers: hexIssuers, nonce: lastNonce },
        signingKeyRef,
      ),
      waitForFinalization,
      params,
    );
  }

  /**
   * Unsuspends issuers in the registry.
   * @param convenerDid
   * @param registryId
   * @param issuers
   * @param signingKeyRef
   * @param nonce
   * @param didModule
   * @param params
   * @param waitForFinalization
   * @param params
   * @returns {Promise<null>}
   */
  async unsuspendIssuers(
    convenerDid,
    registryId,
    issuers,
    signingKeyRef,
    { nonce = undefined, didModule = undefined } = {},
    waitForFinalization = true,
    params = {},
  ) {
    const [convenerHexDid, lastNonce] = await this.getActorDidAndNonce(convenerDid, { nonce, didModule });

    const hexIssuers = new BTreeSet();
    for (const issuer of issuers) {
      hexIssuers.add(typedHexDID(this.api, issuer));
    }

    return this.signAndSend(
      convenerHexDid.changeState(
        this.api,
        this.module.unsuspendIssuers,
        'UnsuspendIssuers',
        { registryId, issuers: hexIssuers, nonce: lastNonce },
        signingKeyRef,
      ),
      waitForFinalization,
      params,
    );
  }

  /**
   * Unsuspends issuers in the registry.
   * @param issuerDid
   * @param registryId
   * @param issuers
   * @param delegated
   * @param signingKeyRef
   * @param params
   * @param waitForFinalization
   * @param params
   * @returns {Promise<null>}
   */
  async updateDelegatedIssuers(
    issuerDid,
    registryId,
    delegated,
    signingKeyRef,
    { nonce = undefined, didModule = undefined } = {},
    waitForFinalization = true,
    params = {},
  ) {
    const [issuerHexDid, lastNonce] = await this.getActorDidAndNonce(issuerDid, { nonce, didModule });

    return this.signAndSend(
      issuerHexDid.changeState(
        this.api,
        this.module.updateDelegatedIssuers,
        'UpdateDelegatedIssuers',
        { registryId, delegated, nonce: lastNonce },
        signingKeyRef,
      ),
      waitForFinalization,
      params,
    );
  }

  /**
   * Get the DID doing the action and its corresponding nonce.
   * @param actorDid
   * @param nonce
   * @param didModule
   * @returns {Promise}
   */
  async getActorDidAndNonce(actorDid, { nonce = undefined, didModule = undefined } = {}) {
    const hexDID = typedHexDID(this.api, actorDid);
    const lastNonce = nonce ?? (await getDidNonce(hexDID, nonce, didModule));
    return [hexDID, lastNonce];
  }
}
