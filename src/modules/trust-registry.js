import { BTreeSet, BTreeMap } from '@polkadot/types';
import { DidMethodKey, DockDid, typedHexDID } from '../utils/did';
import { getDidNonce, ensureMatchesPattern } from '../utils/misc';

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
   * @param nonceOrDidModule
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
    nonceOrDidModule,
    waitForFinalization = true,
    params = {},
  ) {
    const tx = await this.initOrUpdateTx(
      convenerDid,
      registryId,
      name,
      govFramework,
      signingKeyRef,
      nonceOrDidModule,
    );
    return this.signAndSend(
      tx,
      waitForFinalization,
      params,
    );
  }

  /**
   * Initializes Trust Registry with the supplied parameters.
   * @param convenerDid
   * @param registryId
   * @param name
   * @param govFramework
   * @param signingKeyRef
   * @param nonceOrDidModule
   * @param waitForFinalization
   * @param params
   * @returns {Promise<null>}
   */
  async initOrUpdateTx(
    convenerDid,
    registryId,
    name,
    govFramework,
    signingKeyRef,
    { nonce = undefined, didModule = undefined } = {},
  ) {
    const [convenerHexDid, lastNonce] = await this.getActorDidAndNonce(
      convenerDid,
      { nonce, didModule },
    );

    return convenerHexDid.changeState(
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
    );
  }

  /**
   * Updates schema metadatas in the registry.
   * @param convenerOrIssuerOrVerifierDid
   * @param registryId
   * @param schemas
   * @param signingKeyRef
   * @param nonceOrDidModule
   * @param waitForFinalization
   * @param params
   * @returns {Promise<null>}
   */
  async setSchemasMetadata(
    convenerOrIssuerOrVerifierDid,
    registryId,
    schemas,
    signingKeyRef,
    nonceOrDidModule,
    waitForFinalization = true,
    params = {},
  ) {
    const tx = await this.setSchemasMetadataTx(
      convenerOrIssuerOrVerifierDid,
      registryId,
      schemas,
      signingKeyRef,
      nonceOrDidModule,
    );
    return this.signAndSend(
      tx,
      waitForFinalization,
      params,
    );
  }

  /**
   * Creates a transaction to update schema metadatas in the registry.
   * @param convenerOrIssuerOrVerifierDid
   * @param registryId
   * @param schemas
   * @param signingKeyRef
   * @param nonce
   * @param didModule
   * @returns {Promise<null>}
   */
  async setSchemasMetadataTx(
    convenerOrIssuerOrVerifierDid,
    registryId,
    schemas,
    signingKeyRef,
    { nonce = undefined, didModule = undefined } = {},
  ) {
    const [convenerOrIssuerOrVerifierHexDid, lastNonce] = await this.getActorDidAndNonce(convenerOrIssuerOrVerifierDid, {
      nonce,
      didModule,
    });
    ensureMatchesPattern(this.constructor.SchemasUpdatePattern, schemas);

    return convenerOrIssuerOrVerifierHexDid.changeState(
      this.api,
      this.module.setSchemasMetadata,
      'SetSchemasMetadata',
      { registryId, schemas, nonce: lastNonce },
      signingKeyRef,
    );
  }

  /**
   * Suspends issuers in the registry.
   * @param convenerDid
   * @param registryId
   * @param issuers
   * @param signingKeyRef
   * @param nonceOrDidModule
   * @param waitForFinalization
   * @param params
   * @returns {Promise<null>}
   */
  async suspendIssuers(
    convenerDid,
    registryId,
    issuers,
    signingKeyRef,
    nonceOrDidModule,
    waitForFinalization = true,
    params = {},
  ) {
    const tx = await this.suspendIssuersTx(
      convenerDid,
      registryId,
      issuers,
      signingKeyRef,
      nonceOrDidModule,
    );
    return this.signAndSend(
      tx,
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
   * @param nonceOrDidModule
   * @returns {Promise<null>}
   */
  async suspendIssuersTx(
    convenerDid,
    registryId,
    issuers,
    signingKeyRef,
    { nonce = undefined, didModule = undefined } = {},
  ) {
    const [convenerHexDid, lastNonce] = await this.getActorDidAndNonce(
      convenerDid,
      { nonce, didModule },
    );

    const hexIssuers = new BTreeSet();
    for (const issuer of issuers) {
      hexIssuers.add(typedHexDID(this.api, issuer));
    }

    return convenerHexDid.changeState(
      this.api,
      this.module.suspendIssuers,
      'SuspendIssuers',
      { registryId, issuers: hexIssuers, nonce: lastNonce },
      signingKeyRef,
    );
  }

  /**
   * Unsuspends issuers in the registry.
   * @param convenerDid
   * @param registryId
   * @param issuers
   * @param signingKeyRef
   * @param nonceOrDidModule
   * @param waitForFinalization
   * @param params
   * @returns {Promise<null>}
   */
  async unsuspendIssuers(
    convenerDid,
    registryId,
    issuers,
    signingKeyRef,
    nonceOrDidModule,
    waitForFinalization = true,
    params = {},
  ) {
    const tx = await this.unsuspendIssuersTx(
      convenerDid,
      registryId,
      issuers,
      signingKeyRef,
      nonceOrDidModule,
    );
    return this.signAndSend(
      tx,
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
   * @param nonceOrDidModule
   * @returns {Promise<null>}
   */
  async unsuspendIssuersTx(
    convenerDid,
    registryId,
    issuers,
    signingKeyRef,
    { nonce = undefined, didModule = undefined } = {},
  ) {
    const [convenerHexDid, lastNonce] = await this.getActorDidAndNonce(
      convenerDid,
      { nonce, didModule },
    );

    const hexIssuers = new BTreeSet();
    for (const issuer of issuers) {
      hexIssuers.add(typedHexDID(this.api, issuer));
    }

    return convenerHexDid.changeState(
      this.api,
      this.module.unsuspendIssuers,
      'UnsuspendIssuers',
      { registryId, issuers: hexIssuers, nonce: lastNonce },
      signingKeyRef,
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
    const [issuerHexDid, lastNonce] = await this.getActorDidAndNonce(
      issuerDid,
      { nonce, didModule },
    );

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
  async getActorDidAndNonce(
    actorDid,
    { nonce = undefined, didModule = undefined } = {},
  ) {
    const hexDID = typedHexDID(this.api, actorDid);
    const lastNonce = nonce ?? (await getDidNonce(hexDID, nonce, didModule));
    return [hexDID, lastNonce];
  }
}

const DockDidOrDidMethodKeyPattern = {
  $anyOf: [{ $instanceOf: DockDid }, { $instanceOf: DidMethodKey }],
};

const VerificationPricePattern = {
  $anyOf: [{ $matchType: 'number' }, { $matchType: 'object' }],
};

const VerifiersPattern = {
  $instanceOf: BTreeSet,
  $iterableOf: DockDidOrDidMethodKeyPattern,
};

const VerifiersUpdatePattern = {
  $instanceOf: BTreeMap,
  $mapOf: [
    DockDidOrDidMethodKeyPattern,
    {
      $anyOf: [
        { $matchValue: 'Remove' },
        {
          $matchValue: 'Add',
        },
      ],
    },
  ],
};

const IssuerPricesPattern = {
  $instanceOf: BTreeMap,
  $mapOf: [{ $matchType: 'string' }, VerificationPricePattern],
};

const IssuerPricesUpdatePattern = {
  $instanceOf: BTreeMap,
  $mapOf: [
    { $matchType: 'string' },
    {
      $anyOf: [
        { $matchValue: 'Remove' },
        {
          $objOf: {
            Add: VerificationPricePattern,
            Set: VerificationPricePattern,
          },
        },
      ],
    },
  ],
};

const IssuersPattern = {
  $instanceOf: BTreeMap,
  $mapOf: [DockDidOrDidMethodKeyPattern, IssuerPricesPattern],
};

const IssuersUpdatePattern = {
  $instanceOf: BTreeMap,
  $mapOf: [
    DockDidOrDidMethodKeyPattern,
    {
      $objOf: {
        Modify: IssuerPricesUpdatePattern,
        Set: IssuerPricesPattern,
      },
    },
  ],
};

const SetAllSchemasPattern = {
  $instanceOf: BTreeMap,
  $mapOf: [
    { $matchType: 'string' },
    {
      $matchObject: {
        issuers: IssuersPattern,
        verifiers: VerifiersPattern,
      },
    },
  ],
};

const ModifySchemasPattern = {
  $instanceOf: BTreeMap,
  $mapOf: [
    { $matchType: 'string' },
    {
      $anyOf: [
        {
          $objOf: {
            Add: {
              $matchObject: {
                issuers: IssuersPattern,
                verifiers: VerifiersPattern,
              },
            },
            Set: {
              $matchObject: {
                issuers: IssuersPattern,
                verifiers: VerifiersPattern,
              },
            },
            Modify: {
              $matchObject: {
                issuers: {
                  $objOf: { Modify: IssuersUpdatePattern, Set: IssuersPattern },
                },
                verifiers: {
                  $objOf: {
                    Modify: VerifiersUpdatePattern,
                    Set: VerifiersPattern,
                  },
                },
              },
            },
          },
        },
        {
          $matchValue: 'Remove',
        },
      ],
    },
  ],
};

TrustRegistryModule.SchemasUpdatePattern = {
  $matchObject: {
    Set: SetAllSchemasPattern,
    Modify: ModifySchemasPattern,
  },
};
