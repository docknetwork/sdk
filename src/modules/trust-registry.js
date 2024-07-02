import { BTreeSet, BTreeMap } from '@polkadot/types';
import { u8aToHex } from '@polkadot/util';
import { DidMethodKey, DockDid, DockDidOrDidMethodKey } from '../did';
import { isHexWithGivenByteSize } from '../utils/codec';
import { getDidNonce, ensureMatchesPattern } from '../utils/misc';

const callValueMethodOrObjectMethod = (method) => (value) => (typeof value[method] === 'function'
  ? [...value[method]()]
  : Object[method](value));

const entries = callValueMethodOrObjectMethod('entries');
const values = callValueMethodOrObjectMethod('values');

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
   * Returns Trust Registries information according to the supplied `by` argument.
   * @param by
   */
  async registriesInfo(by) {
    ensureMatchesPattern(this.constructor.RegistriesQueryByPattern, by);

    return this.parseMapEntries(
      String,
      this.parseRegistryInfo,
      await this.api.rpc.trustRegistry.registriesInfoBy(by),
    );
  }

  /**
   * Returns schemas metadata for the registry according to the supplied `by` argument.
   * @param by
   * @param {string} regId
   * @returns {Promise<object>}
   */
  async registrySchemasMetadata(by, regId) {
    ensureMatchesPattern(this.constructor.RegistryQueryByPattern, by);

    return this.parseMapEntries(
      String,
      this.parseSchemaMetadata,
      await this.api.rpc.trustRegistry.registrySchemaMetadataBy(by, regId),
    );
  }

  /**
   * Retrieves metadata for the supplied `schemaId`/`regId` combination.
   *
   * @param {string} schemaId
   * @param {string} regId
   * @returns {Promise<object>}
   */
  async schemaMetadataInRegistry(schemaId, regId) {
    return this.parseSingleEntry(
      this.parseSchemaMetadata,
      await this.api.rpc.trustRegistry.schemaMetadataInRegistry(
        schemaId,
        regId,
      ),
    );
  }

  /**
   * Retrieves metadata for the supplied `schemaId` from all registries.
   *
   * @param {string} schemaId
   * @returns {Promise<object>}
   */
  async schemaMetadata(schemaId) {
    return this.parseMapEntries(
      String,
      this.parseSchemaMetadata,
      await this.api.rpc.trustRegistry.schemaMetadata(schemaId),
    );
  }

  /**
   * Retrieves issuers for the supplied `schemaId`/`regId` combination.
   *
   * @param {string} schemaId
   * @param {string} regId
   * @returns {Promise<object>}
   */
  async schemaIssuersInRegistry(schemaId, regId) {
    return this.parseSingleEntry(
      this.parseSchemaIssuers,
      await this.api.rpc.trustRegistry.schemaIssuersInRegistry(schemaId, regId),
    );
  }

  /**
   * Retrieves issuers for the supplied `schemaId` from all registries.
   *
   * @param {string} schemaId
   * @returns {Promise<object>}
   */
  async schemaIssuers(schemaId) {
    return this.parseMapEntries(
      String,
      this.parseSchemaIssuers,
      await this.api.rpc.trustRegistry.schemaIssuers(schemaId),
    );
  }

  /**
   * Retrieves verifiers for the supplied `schemaId`/`regId` combination.
   *
   * @param {string} schemaId
   * @param {string} regId
   * @returns {Promise<object>}
   */
  async schemaVerifiersInRegistry(schemaId, regId) {
    return this.parseSingleEntry(
      this.parseSchemaVerifiers,
      await this.api.rpc.trustRegistry.schemaVerifiersInRegistry(
        schemaId,
        regId,
      ),
    );
  }

  /**
   * Retrieves verifiers for the supplied `schemaId` from all registries.
   *
   * @param {string} schemaId
   * @returns {Promise<object>}
   */
  async schemaVerifiers(schemaId) {
    return this.parseMapEntries(
      String,
      this.parseSchemaVerifiers,
      await this.api.rpc.trustRegistry.schemaVerifiers(schemaId),
    );
  }

  /**
   * Returns an Array containing `TrustRegistry` participant DIDs.
   *
   * @param registryId
   * @returns {Promise<Array<DidOrDidMethodKey>>}
   */
  async registryParticipants(registryId) {
    return [
      ...(
        await this.api.query.trustRegistry.trustRegistriesParticipants(
          registryId,
        )
      ).values(),
    ].map((did) => DockDidOrDidMethodKey.from(did));
  }

  /**
   * Returns an Object containing `TrustRegistry` participant DIDs mapped to their informations.
   *
   * @param registryId
   * @param participantDIDs
   *
   * @returns {Promise<Object<string, object>>}
   */
  async registryParticipantsInfo(registryId, participantDIDs = null) {
    const participants = participantDIDs
      ? [...participantDIDs].map((did) => DockDidOrDidMethodKey.from(did))
      : await this.registryParticipants(registryId);

    const participantWithInfo = async (did) => {
      const info = await this.api.query.trustRegistry.trustRegistryParticipantsInformation(
        registryId,
        did,
      );

      return [did, info.isSome ? info.unwrap().toJSON() : null];
    };

    return Object.fromEntries(
      await Promise.all(participants.map(participantWithInfo)),
    );
  }

  /**
   * Initializes Trust Registry with the supplied parameters.
   *
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
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Initializes Trust Registry with the supplied parameters.
   *
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
   * Creates a signature for participants change produced by given `convenerOrIssuerOrVerifierDid` using supplied `signingKeyRef`.
   * To add participant(s), the action must be signed by both the `Convener` and all participants to be added.
   * To remove participant(s), the action must be signed by all participants who wish to be removed.
   * In summary, if at least one participant is being added, the `Convener`'s signature is required.
   *
   * @param convenerOrIssuerOrVerifierDid
   * @param registryId
   * @param participants
   * @param signingKeyRef
   */
  async signChangeParticipants(
    convenerOrIssuerOrVerifierDid,
    registryId,
    participants,
    signingKeyRef,
    { nonce = undefined, didModule = undefined } = {},
  ) {
    const [convenerOrIssuerOrVerifierHexDid, lastNonce] = await this.getActorDidAndNonce(convenerOrIssuerOrVerifierDid, {
      nonce,
      didModule,
    });

    return {
      sig: convenerOrIssuerOrVerifierHexDid.signStateChange(
        this.api,
        'ChangeParticipants',
        { data: { registryId, participants }, nonce: lastNonce },
        signingKeyRef,
      ),
      nonce: lastNonce,
    };
  }

  /**
   * Changes participants in the provided registry.
   * This method is used to add or remove `Verifier`s and `Issuer`s, allowing the `Convener` to
   * include them in the schema metadata.
   * To add participant(s), the action must be signed by both the `Convener` and all participants to be added.
   * To remove participant(s), the action must be signed by all participants who wish to be removed.
   * In summary, if at least one participant is being added, the `Convener`'s signature is required.
   *
   * @param registryId
   * @param participants
   * @param sigs
   * @param waitForFinalization
   * @param params
   * @returns {Promise<null>}
   */
  async changeParticipants(
    registryId,
    participants,
    sigs,
    waitForFinalization = true,
    params = {},
  ) {
    return this.signAndSend(
      await this.changeParticipantsTx(registryId, participants, sigs),
      waitForFinalization,
      params,
    );
  }

  /**
   * Creates a transaction to change participants in the registry.
   *
   * @param registryId
   * @param participants
   * @param sigs
   * @returns {Promise<null>}
   */
  async changeParticipantsTx(registryId, participants, sigs) {
    ensureMatchesPattern(
      this.constructor.ChangeParticipantsPattern,
      participants,
    );

    return this.module.changeParticipants(
      {
        registryId,
        participants,
      },
      sigs,
    );
  }

  /**
   * Creates a signature for setting a participant's information produced by given `convenerOrIssuerOrVerifierDid` using supplied `signingKeyRef`.
   * This transaction requires signatures from both the Convener and the participant.
   *
   * @param convenerOrIssuerOrVerifierDid
   * @param registryId
   * @param participant
   * @param participants
   * @param signingKeyRef
   */
  async signSetParticipantInformation(
    convenerOrIssuerOrVerifierDid,
    registryId,
    participant,
    participantInformation,
    signingKeyRef,
    { nonce = undefined, didModule = undefined } = {},
  ) {
    const [convenerOrIssuerOrVerifierHexDid, lastNonce] = await this.getActorDidAndNonce(convenerOrIssuerOrVerifierDid, {
      nonce,
      didModule,
    });

    return {
      sig: convenerOrIssuerOrVerifierHexDid.signStateChange(
        this.api,
        'SetParticipantInformation',
        {
          data: { registryId, participant, participantInformation },
          nonce: lastNonce,
        },
        signingKeyRef,
      ),
      nonce: lastNonce,
    };
  }

  /**
   * Changes participant information in the provided registry.
   * This transaction requires signatures from both the Convener and the participant.
   *
   * @param registryId
   * @param participant
   * @param participantInformation
   * @param sigs
   * @param waitForFinalization
   * @param params
   * @returns {Promise<null>}
   */
  async setParticipantInformation(
    registryId,
    participant,
    participantInformation,
    sigs,
    waitForFinalization = true,
    params = {},
  ) {
    return this.signAndSend(
      await this.setParticipantInformationTx(
        registryId,
        participant,
        participantInformation,
        sigs,
      ),
      waitForFinalization,
      params,
    );
  }

  /**
   * Creates a transaction to set participant information in the supplied registry.
   *
   * @param registryId
   * @param participant
   * @param participants
   * @param sigs
   * @returns {Promise<null>}
   */
  async setParticipantInformationTx(
    registryId,
    participant,
    participantInformation,
    sigs,
  ) {
    ensureMatchesPattern(
      this.constructor.SetParticipantInformationPattern,
      participantInformation,
    );

    return this.module.setParticipantInformation(
      {
        registryId,
        participant,
        participantInformation,
      },
      sigs,
    );
  }

  /**
   * Sets schema metadatas in the registry.
   *
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
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Creates a transaction to update schema metadatas in the registry.
   *
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
   *
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
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Suspends issuers in the registry.
   *
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

    const hexIssuers = new BTreeSet(this.api.registry, 'Issuer');
    for (const issuer of issuers) {
      hexIssuers.add(DockDidOrDidMethodKey.from(issuer));
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
   *
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
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Unsuspends issuers in the registry.
   *
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

    const hexIssuers = new BTreeSet(this.api.registry, 'Issuer');
    for (const issuer of issuers) {
      hexIssuers.add(DockDidOrDidMethodKey.from(issuer));
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
   * Sets delegated issuers for the caller DID.
   *
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
   *
   * @param actorDid
   * @param nonce
   * @param didModule
   * @returns {Promise}
   */
  async getActorDidAndNonce(
    actorDid,
    { nonce = undefined, didModule = undefined } = {},
  ) {
    const hexDID = DockDidOrDidMethodKey.from(actorDid);
    const lastNonce = nonce ?? (await getDidNonce(hexDID, nonce, didModule));
    return [hexDID, lastNonce];
  }

  /**
   * Parses Trust Registry information received from the substrate side.
   *
   * @param registryInfo
   */
  parseRegistryInfo({ name, convener, govFramework }) {
    return {
      name: name.toString(),
      convener: DockDidOrDidMethodKey.from(convener).toString(),
      govFramework: u8aToHex(govFramework),
    };
  }

  /**
   * Parses map entries by converting keys to `string`s and applying supplied parser to the value.
   *
   * @template {Key}
   * @template {Value}
   * @template {ParsedKey}
   * @template {ParsedValue}
   *
   * @param {function(Key): ParsedKey} keyParser
   * @param {function(Value): ParsedValue} valueParser
   * @param {Map<Key, Value>} regs
   * @returns {Object<ParsedKey, ParsedValue>}
   */
  parseMapEntries(keyParser, valueParser, map) {
    return Object.fromEntries(
      entries(map)
        .map(([key, value]) => [
          keyParser.call(this, key),
          valueParser.call(this, value),
        ])
        .sort(([key1], [key2]) => key1.localeCompare(key2)),
    );
  }

  /**
   * Parses a single entry.
   *
   * @template {Value}
   * @template {ParsedValue}
   * @param {function(Value): ParsedValue}
   * @returns {ParsedValue}
   */
  parseSingleEntry(parser, valueOpt) {
    let value;

    if (valueOpt.isNone) {
      return null;
    } else if (valueOpt.isSome) {
      value = valueOpt.unwrap();
    } else {
      value = valueOpt;
    }

    return parser.call(this, value);
  }

  /**
   * Parses schema metadata.
   *
   * @param {{ issuers: Map, verifiers: Set }} metadata
   * @returns {{ issuers: object, verifiers: Array }}
   */
  parseSchemaMetadata({ issuers, verifiers }) {
    return {
      issuers: this.parseSchemaIssuers(issuers),
      verifiers: this.parseSchemaVerifiers(verifiers),
    };
  }

  /**
   * Parses schema issuers.
   *
   * @param {Map} issuers
   * @returns {object}
   */
  parseSchemaIssuers(issuers) {
    return Object.fromEntries(
      (Array.isArray(issuers) ? values(issuers) : entries(issuers))
        .map((issuerWithInfo) => values(issuerWithInfo))
        .map(([issuer, info]) => [
          DockDidOrDidMethodKey.from(issuer).toString(),
          typeof info.toJSON === 'function' ? info.toJSON() : info,
        ])
        .sort(([iss1], [iss2]) => iss1.localeCompare(iss2)),
    );
  }

  /**
   * Parses schema verifiers.
   *
   * @param {Array} verifiers
   * @returns {object}
   */
  parseSchemaVerifiers(verifiers) {
    return values(verifiers)
      .map((verifier) => DockDidOrDidMethodKey.from(verifier).toString())
      .sort((ver1, ver2) => ver1.localeCompare(ver2));
  }
}

const DockDidOrDidMethodKeyPattern = {
  $anyOf: [{ $instanceOf: DockDid }, { $instanceOf: DidMethodKey }],
};

const VerificationPricePattern = {
  $anyOf: [{ $matchType: 'number' }, { $matchType: 'object' }],
};

const Hex32Pattern = {
  $ensure: (value) => {
    if (!isHexWithGivenByteSize(value, 32)) {
      throw new Error(`Expected 32-byte hex sequence, received: ${value}`);
    }
  },
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
    Hex32Pattern,
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
    Hex32Pattern,
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
const AnyOfOrAllDockDidOrDidMethodKeyPattern = {
  $objOf: {
    All: {
      $iterableOf: DockDidOrDidMethodKeyPattern,
    },
    AnyOf: {
      $iterableOf: DockDidOrDidMethodKeyPattern,
    },
  },
};

TrustRegistryModule.SetParticipantInformationPattern = {
  $matchObject: {
    orgName: {
      $matchType: 'string',
    },
    logo: {
      $matchType: 'string',
    },
    description: {
      $matchType: 'string',
    },
  },
};
TrustRegistryModule.SchemasUpdatePattern = {
  $objOf: {
    Set: SetAllSchemasPattern,
    Modify: ModifySchemasPattern,
  },
};
TrustRegistryModule.ChangeParticipantsPattern = {
  $mapOf: [
    DockDidOrDidMethodKeyPattern,
    {
      $anyOf: [
        {
          $matchValue: 'Add',
        },
        {
          $matchValue: 'Remove',
        },
      ],
    },
  ],
};
TrustRegistryModule.RegistryQueryByPattern = {
  $matchObject: {
    issuers: AnyOfOrAllDockDidOrDidMethodKeyPattern,
    verifiers: AnyOfOrAllDockDidOrDidMethodKeyPattern,
    issuersOrVerifiers: AnyOfOrAllDockDidOrDidMethodKeyPattern,
    schemaIds: {
      $iterableOf: Hex32Pattern,
    },
  },
};
TrustRegistryModule.RegistriesQueryByPattern = {
  $matchObject: {
    issuers: AnyOfOrAllDockDidOrDidMethodKeyPattern,
    verifiers: AnyOfOrAllDockDidOrDidMethodKeyPattern,
    issuersOrVerifiers: AnyOfOrAllDockDidOrDidMethodKeyPattern,
    schemaIds: {
      $objOf: {
        All: {
          $iterableOf: Hex32Pattern,
        },
        AnyOf: {
          $iterableOf: Hex32Pattern,
        },
      },
    },
  },
};
