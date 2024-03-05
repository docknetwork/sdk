import { randomAsHex } from '@polkadot/util-crypto';
import { BTreeSet, BTreeMap } from '@polkadot/types';
import { u8aToHex, stringToU8a } from '@polkadot/util';

import { DockAPI } from '../../src/index';

import {
  FullNodeEndpoint,
  TestKeyringOpts,
  TestAccountURI,
  DisableDidKeyAndTrustRegistryTests,
} from '../test-constants';

import {
  DidKeypair,
  DidMethodKey,
  DockDid,
} from '../../src/utils/did';
import { registerNewDIDUsingPair } from './helpers';

const buildTest = DisableDidKeyAndTrustRegistryTests ? describe.skip : describe;

buildTest('Trust Registry', () => {
  const dock = new DockAPI();

  // Create a new convener DID, the DID will be registered on the network and own the trust registry
  const convenerDID = DockDid.random();
  const ownerSeed = randomAsHex(32);
  let convenerPair;

  const issuerDID = DockDid.random();
  const issuerSeed = randomAsHex(32);
  let issuerPair;

  const issuerDID2 = DockDid.random();
  const issuerSeed2 = randomAsHex(32);
  let issuerPair2;

  const verifierDID = DockDid.random();
  const verifierSeed = randomAsHex(32);
  let verifierPair;

  const verifierDID2 = DockDid.random();
  const verifierSeed2 = randomAsHex(32);
  let verifierPair2;

  const verifierDIDMethodKeySeed = randomAsHex(32);
  let verifierDIDMethodKeyPair;
  let verifierDIDMethodKey;

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });

    convenerPair = new DidKeypair(
      dock.keyring.addFromUri(ownerSeed, null, 'ed25519'),
      1,
    );

    issuerPair = new DidKeypair(
      dock.keyring.addFromUri(issuerSeed, null, 'ed25519'),
      1,
    );

    issuerPair2 = new DidKeypair(
      dock.keyring.addFromUri(issuerSeed2, null, 'ed25519'),
      1,
    );

    verifierPair = new DidKeypair(
      dock.keyring.addFromUri(verifierSeed, null, 'ed25519'),
      1,
    );

    verifierPair2 = new DidKeypair(
      dock.keyring.addFromUri(verifierSeed2, null, 'ed25519'),
      1,
    );

    verifierDIDMethodKeyPair = DidKeypair.fromApi(dock, {
      seed: verifierDIDMethodKeySeed,
      meta: null,
      keypairType: 'ed25519',
    });
    verifierDIDMethodKey = DidMethodKey.fromKeypair(verifierDIDMethodKeyPair);

    // The keyring should be initialized before any test begins as this suite is testing trust registry
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);

    // Register convener
    await registerNewDIDUsingPair(dock, convenerDID, convenerPair);
    // Register issuer DIDs
    await registerNewDIDUsingPair(dock, issuerDID, issuerPair);
    await registerNewDIDUsingPair(dock, issuerDID2, issuerPair2);
    await registerNewDIDUsingPair(dock, verifierDID, verifierPair);
    await registerNewDIDUsingPair(dock, verifierDID2, verifierPair2);
    await dock.did.newDidMethodKey(verifierDIDMethodKey.asDidMethodKey);
  }, 40000);

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);

  it('Initializes Trust Registry', async () => {
    const trustRegistryId = randomAsHex(32);
    expect(
      (await dock.api.query.trustRegistry.trustRegistriesInfo(trustRegistryId))
        .isNone,
    ).toEqual(true);

    await dock.trustRegistry.initOrUpdate(
      convenerDID,
      trustRegistryId,
      'Test Registry',
      'Gov framework',
      convenerPair,
      dock,
    );

    const registryInfo = (
      await dock.api.query.trustRegistry.trustRegistriesInfo(trustRegistryId)
    ).toJSON();
    expect(registryInfo).toEqual({
      convener: convenerDID,
      name: 'Test Registry',
      govFramework: u8aToHex(stringToU8a('Gov framework')),
    });
  });

  it('Fetches information about all trust registries/schemas metadata where given issuer/verifier exists', async () => {
    const schemaId = randomAsHex(32);
    const schemaId2 = randomAsHex(32);
    const trustRegistryId = randomAsHex(32);
    const trustRegistryId2 = randomAsHex(32);

    await dock.trustRegistry.initOrUpdate(
      convenerDID,
      trustRegistryId,
      'Test Registry',
      'Gov framework',
      convenerPair,
      dock,
    );

    await dock.trustRegistry.initOrUpdate(
      convenerDID,
      trustRegistryId2,
      'Test Registry 2',
      'Gov framework',
      convenerPair,
      dock,
    );

    const verifiers = new BTreeSet();
    verifiers.add(verifierDID);
    verifiers.add(verifierDID2);

    const issuers = new BTreeMap();
    const issuerPrices = new BTreeMap();
    issuerPrices.set('A', 20);
    const issuer2Prices = new BTreeMap();
    issuer2Prices.set('A', 20);

    issuers.set(issuerDID, issuerPrices);
    issuers.set(issuerDID2, issuer2Prices);

    const schemas = new BTreeMap();
    schemas.set(schemaId, {
      issuers,
      verifiers,
    });

    const schema2Issuers = new BTreeMap();
    const schema2IssuerPrices = new BTreeMap();

    schema2IssuerPrices.set('C', 40);
    schema2Issuers.set(issuerDID, schema2IssuerPrices);
    schemas.set(schemaId2, {
      issuers: schema2Issuers,
    });

    await dock.trustRegistry.setSchemasMetadata(
      convenerDID,
      trustRegistryId,
      { Set: schemas },
      convenerPair,
      dock,
    );

    expect(
      (
        await dock.api.query.trustRegistry.verifiersTrustRegistries(
          verifierDIDMethodKey,
        )
      ).toJSON(),
    ).toEqual([]);
    expect(
      (
        await dock.api.query.trustRegistry.issuersTrustRegistries(issuerDID)
      ).toJSON(),
    ).toEqual([trustRegistryId]);
    expect(
      (
        await dock.api.query.trustRegistry.verifiersTrustRegistries(
          verifierDID2,
        )
      ).toJSON(),
    ).toEqual([trustRegistryId]);

    await dock.trustRegistry.setSchemasMetadata(
      convenerDID,
      trustRegistryId2,
      { Set: schemas },
      convenerPair,
      dock,
    );

    expect(
      (
        await dock.api.query.trustRegistry.verifiersTrustRegistries(
          verifierDIDMethodKey,
        )
      ).toJSON(),
    ).toEqual([]);
    expect(
      (
        await dock.api.query.trustRegistry.issuersTrustRegistries(issuerDID)
      ).toJSON(),
    ).toEqual([trustRegistryId, trustRegistryId2].sort());
    expect(
      (
        await dock.api.query.trustRegistry.verifiersTrustRegistries(
          verifierDID2,
        )
      ).toJSON(),
    ).toEqual([trustRegistryId, trustRegistryId2].sort());

    verifiers.add(verifierDIDMethodKey);

    await dock.trustRegistry.setSchemasMetadata(
      convenerDID,
      trustRegistryId2,
      { Set: schemas },
      convenerPair,
      dock,
    );

    expect(
      (
        await dock.api.query.trustRegistry.verifiersTrustRegistries(
          verifierDIDMethodKey,
        )
      ).toJSON(),
    ).toEqual([trustRegistryId2]);

    const RegInfo = {
      [trustRegistryId]: {
        convener: convenerDID.toQualifiedEncodedString(),
        name: 'Test Registry',
        govFramework: u8aToHex(stringToU8a('Gov framework')),
      },
    };
    const Reg2Info = {
      [trustRegistryId2]: {
        convener: convenerDID.toQualifiedEncodedString(),
        name: 'Test Registry 2',
        govFramework: u8aToHex(stringToU8a('Gov framework')),
      },
    };
    const BothRegsInfo = trustRegistryId.localeCompare(trustRegistryId2) >= 0
      ? { ...RegInfo, ...Reg2Info }
      : { ...Reg2Info, ...RegInfo };

    expect(
      await dock.trustRegistry.registriesInfo({
        verifiers: {
          AnyOf: [verifierDIDMethodKey],
        },
      }),
    ).toEqual(Reg2Info);
    expect(
      await dock.trustRegistry.registriesInfo({
        issuers: {
          AnyOf: [verifierDIDMethodKey],
        },
      }),
    ).toEqual({});
    expect(
      await dock.trustRegistry.registriesInfo({
        issuersOrVerifiers: {
          AnyOf: [verifierDIDMethodKey],
        },
      }),
    ).toEqual(Reg2Info);
    expect(
      await dock.trustRegistry.registriesInfo({
        issuers: {
          AnyOf: [verifierDIDMethodKey],
        },
        verifiers: {
          AnyOf: [verifierDIDMethodKey],
        },
      }),
    ).toEqual({});
    expect(
      await dock.trustRegistry.registriesInfo({
        schemaIds: { AnyOf: [schemaId] },
      }),
    ).toEqual(BothRegsInfo);

    expect(
      await dock.trustRegistry.registriesInfo({
        schemaIds: {
          AnyOf: [schemaId],
        },
        verifiers: {
          AnyOf: [verifierDID],
        },
      }),
    ).toEqual(BothRegsInfo);
    expect(
      await dock.trustRegistry.registriesInfo({
        schemaIds: {
          AnyOf: [schemaId],
        },
        verifiers: {
          AnyOf: [verifierDID],
        },
        issuers: {
          AnyOf: [verifierDID],
        },
      }),
    ).toEqual({});
    expect(
      await dock.trustRegistry.registriesInfo({
        schemaIds: {
          AnyOf: [schemaId],
        },
        issuersOrVerifiers: {
          AnyOf: [verifierDID, issuerDID2],
        },
      }),
    ).toEqual(BothRegsInfo);

    const schema1MetadataInTrustRegistry1 = dock.trustRegistry.parseSchemaMetadata({
      issuers: [
        [
          issuerDID,
          {
            delegated: [],
            suspended: false,
            verificationPrices: {
              A: 20,
            },
          },
        ],
        [
          issuerDID2,
          {
            delegated: [],
            suspended: false,
            verificationPrices: {
              A: 20,
            },
          },
        ],
      ],
      verifiers: [verifierDID, verifierDID2],
    });
    const schema1MetadataInTrustRegistry2 = dock.trustRegistry.parseSchemaMetadata({
      issuers: [
        [
          issuerDID,
          {
            delegated: [],
            suspended: false,
            verificationPrices: {
              A: 20,
            },
          },
        ],
        [
          issuerDID2,
          {
            delegated: [],
            suspended: false,
            verificationPrices: {
              A: 20,
            },
          },
        ],
      ],
      verifiers: [verifierDID, verifierDID2, verifierDIDMethodKey],
    });
    const schema2MetadataInTrustRegistry1 = dock.trustRegistry.parseSchemaMetadata({
      issuers: [
        [
          issuerDID,
          {
            delegated: [],
            suspended: false,
            verificationPrices: {
              C: 40,
            },
          },
        ],
      ],
      verifiers: [],
    });

    expect(
      await dock.trustRegistry.registrySchemasMetadata(
        {
          verifiers: { AnyOf: [verifierDIDMethodKey] },
        },
        trustRegistryId2,
      ),
    ).toEqual({ [schemaId]: schema1MetadataInTrustRegistry2 });
    expect(
      await dock.trustRegistry.registrySchemasMetadata(
        {
          issuersOrVerifiers: { AnyOf: [verifierDIDMethodKey] },
        },
        trustRegistryId2,
      ),
    ).toEqual({ [schemaId]: schema1MetadataInTrustRegistry2 });
    expect(
      await dock.trustRegistry.registrySchemasMetadata(
        {
          issuers: { AnyOf: [verifierDIDMethodKey] },
        },
        trustRegistryId,
      ),
    ).toEqual({});
    expect(
      await dock.trustRegistry.registrySchemasMetadata(
        {
          issuers: {
            AnyOf: [verifierDIDMethodKey, issuerDID],
          },
        },
        trustRegistryId,
      ),
    ).toEqual({
      [schemaId]: schema1MetadataInTrustRegistry1,
      [schemaId2]: schema2MetadataInTrustRegistry1,
    });
    expect(
      await dock.trustRegistry.registrySchemasMetadata(
        {
          issuersOrVerifiers: { AnyOf: [verifierDIDMethodKey] },
        },
        trustRegistryId,
      ),
    ).toEqual({});
    expect(
      await dock.trustRegistry.registrySchemasMetadata(
        {
          issuers: { AnyOf: [issuerDID] },
          verifiers: { AnyOf: [verifierDIDMethodKey] },
        },
        trustRegistryId2,
      ),
    ).toEqual({ [schemaId]: schema1MetadataInTrustRegistry2 });
    expect(
      await dock.trustRegistry.registrySchemasMetadata(
        {
          schemaIds: [schemaId],
        },
        trustRegistryId,
      ),
    ).toEqual({ [schemaId]: schema1MetadataInTrustRegistry1 });
    expect(
      await dock.trustRegistry.registrySchemasMetadata(
        {
          issuers: {
            AnyOf: [issuerDID, issuerDID2],
          },
          schemaIds: [schemaId],
        },
        trustRegistryId,
      ),
    ).toEqual({ [schemaId]: schema1MetadataInTrustRegistry1 });
    expect(
      await dock.trustRegistry.registrySchemasMetadata({
        issuers: { AnyOf: [verifierDID] },
        schemaIds: [schemaId2],
      }),
    ).toEqual({});

    expect(
      await dock.trustRegistry.schemaMetadataInRegistry(schemaId, trustRegistryId),
    ).toEqual(schema1MetadataInTrustRegistry1);
    expect(
      await dock.trustRegistry.schemaIssuersInRegistry(schemaId, trustRegistryId),
    ).toEqual(schema1MetadataInTrustRegistry1.issuers);
    expect(
      await dock.trustRegistry.schemaVerifiersInRegistry(schemaId, trustRegistryId),
    ).toEqual(schema1MetadataInTrustRegistry1.verifiers);

    expect(
      await dock.trustRegistry.schemaMetadata(schemaId),
    ).toEqual(
      dock.trustRegistry.parseMapEntries(
        dock.trustRegistry.parseSchemaMetadata,
        new Map([
          [trustRegistryId, schema1MetadataInTrustRegistry1],
          [trustRegistryId2, schema1MetadataInTrustRegistry2],
        ]),
      ),
    );
    expect(
      await dock.trustRegistry.schemaVerifiers(schemaId),
    ).toEqual(
      dock.trustRegistry.parseMapEntries(
        dock.trustRegistry.parseSchemaVerifiers,
        new Map([
          [trustRegistryId, [verifierDID, verifierDID2]],
          [trustRegistryId2, [verifierDID, verifierDID2, verifierDIDMethodKey]],
        ]),
      ),
    );
    expect(
      await dock.trustRegistry.schemaIssuers(schemaId),
    ).toEqual(
      dock.trustRegistry.parseMapEntries(
        dock.trustRegistry.parseSchemaIssuers,
        new Map([
          [
            trustRegistryId,
            [
              [
                issuerDID,
                {
                  delegated: [],
                  suspended: false,
                  verificationPrices: {
                    A: 20,
                  },
                },
              ],
              [
                issuerDID2,
                {
                  delegated: [],
                  suspended: false,
                  verificationPrices: {
                    A: 20,
                  },
                },
              ],
            ],
          ],
          [
            trustRegistryId2,
            [
              [
                issuerDID,
                {
                  delegated: [],
                  suspended: false,
                  verificationPrices: {
                    A: 20,
                  },
                },
              ],
              [
                issuerDID2,
                {
                  delegated: [],
                  suspended: false,
                  verificationPrices: {
                    A: 20,
                  },
                },
              ],
            ],
          ],
        ]),
      ),
    );
  });

  it('Adds schemas metadata to the existing Trust Registry', async () => {
    const trustRegistryId = randomAsHex(32);
    const schemaId = randomAsHex(32);
    const otherSchemaId = randomAsHex(32);

    await dock.trustRegistry.initOrUpdate(
      convenerDID,
      trustRegistryId,
      'Test Registry',
      'Gov framework',
      convenerPair,
      dock,
    );

    const verifiers = new BTreeSet();
    verifiers.add(verifierDID);
    verifiers.add(verifierDID2);
    verifiers.add(verifierDIDMethodKey);

    const issuers = new BTreeMap();
    const issuerPrices = new BTreeMap();
    issuerPrices.set('A', 20);
    const issuer2Prices = new BTreeMap();
    issuer2Prices.set('A', 20);

    issuers.set(issuerDID, issuerPrices);
    issuers.set(issuerDID2, issuer2Prices);

    const schemas = new BTreeMap();
    schemas.set(schemaId, {
      Set: {
        issuers,
        verifiers,
      },
    });
    schemas.set(otherSchemaId, {
      Add: {
        issuers,
      },
    });

    await dock.trustRegistry.setSchemasMetadata(
      convenerDID,
      trustRegistryId,
      { Modify: schemas },
      convenerPair,
      dock,
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId,
        )
      ).toJSON(),
    ).toEqual({
      issuers: expectedFormattedIssuers(issuers),
      verifiers: expectedFormattedVerifiers(verifiers),
    });
    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          otherSchemaId,
          trustRegistryId,
        )
      ).toJSON(),
    ).toEqual({
      issuers: expectedFormattedIssuers(issuers),
      verifiers: expectedFormattedVerifiers(new BTreeSet()),
    });
  });

  it('Removes schemas metadata from the Trust Registry', async () => {
    const trustRegistryId = randomAsHex(32);
    const schemaId = randomAsHex(32);
    const otherSchemaId = randomAsHex(32);

    await dock.trustRegistry.initOrUpdate(
      convenerDID,
      trustRegistryId,
      'Test Registry',
      'Gov framework',
      convenerPair,
      dock,
    );

    const verifiers = new BTreeSet();
    verifiers.add(verifierDID);
    verifiers.add(verifierDID2);
    verifiers.add(verifierDIDMethodKey);

    const issuers = new BTreeMap();
    const issuerPrices = new BTreeMap();
    issuerPrices.set('A', 20);
    const issuer2Prices = new BTreeMap();
    issuer2Prices.set('A', 20);

    issuers.set(issuerDID, issuerPrices);
    issuers.set(issuerDID2, issuer2Prices);

    let schemas = new BTreeMap();
    schemas.set(schemaId, {
      Add: {
        issuers,
        verifiers,
      },
    });
    schemas.set(otherSchemaId, {
      Add: {
        issuers,
      },
    });

    await dock.trustRegistry.setSchemasMetadata(
      convenerDID,
      trustRegistryId,
      { Modify: schemas },
      convenerPair,
      dock,
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId,
        )
      ).toJSON(),
    ).toEqual({
      issuers: expectedFormattedIssuers(issuers),
      verifiers: expectedFormattedVerifiers(verifiers),
    });
    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          otherSchemaId,
          trustRegistryId,
        )
      ).toJSON(),
    ).toEqual({
      issuers: expectedFormattedIssuers(issuers),
      verifiers: expectedFormattedVerifiers(new BTreeSet()),
    });

    schemas = new BTreeMap();
    schemas.set(schemaId, 'Remove');
    schemas.set(otherSchemaId, 'Remove');

    await dock.trustRegistry.setSchemasMetadata(
      convenerDID,
      trustRegistryId,
      { Modify: schemas },
      convenerPair,
      dock,
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId,
        )
      ).toJSON(),
    ).toEqual(null);
    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          otherSchemaId,
          trustRegistryId,
        )
      ).toJSON(),
    ).toEqual(null);
  });

  it('Suspends issuers in the existing Trust Registry', async () => {
    const trustRegistryId = randomAsHex(32);
    const schemaId = randomAsHex(32);

    await dock.trustRegistry.initOrUpdate(
      convenerDID,
      trustRegistryId,
      'Test Registry',
      'Gov framework',
      convenerPair,
      dock,
    );

    const verifiers = new BTreeSet();
    verifiers.add(verifierDID);
    verifiers.add(verifierDID2);
    verifiers.add(verifierDIDMethodKey);

    const issuers = new BTreeMap();
    const issuerPrices = new BTreeMap();
    issuerPrices.set('A', 20);
    const issuer2Prices = new BTreeMap();
    issuer2Prices.set('A', 20);

    issuers.set(issuerDID, issuerPrices);
    issuers.set(issuerDID2, issuer2Prices);

    const schemas = new BTreeMap();
    schemas.set(schemaId, {
      Set: {
        issuers,
        verifiers,
      },
    });

    await dock.trustRegistry.setSchemasMetadata(
      convenerDID,
      trustRegistryId,
      { Modify: schemas },
      convenerPair,
      dock,
    );

    await dock.trustRegistry.suspendIssuers(
      convenerDID,
      trustRegistryId,
      [issuerDID, issuerDID2],
      convenerPair,
      dock,
    );

    for (const issuer of [issuerDID, issuerDID2]) {
      expect(
        (
          await dock.api.query.trustRegistry.trustRegistryIssuerConfigurations(
            trustRegistryId,
            issuer,
          )
        ).toJSON(),
      ).toEqual({
        suspended: true,
        delegated: [],
      });
    }

    await dock.trustRegistry.unsuspendIssuers(
      convenerDID,
      trustRegistryId,
      [issuerDID],
      convenerPair,
      dock,
    );

    for (const issuer of [issuerDID]) {
      expect(
        (
          await dock.api.query.trustRegistry.trustRegistryIssuerConfigurations(
            trustRegistryId,
            issuer,
          )
        ).toJSON(),
      ).toEqual({
        suspended: false,
        delegated: [],
      });
    }

    for (const issuer of [issuerDID2]) {
      expect(
        (
          await dock.api.query.trustRegistry.trustRegistryIssuerConfigurations(
            trustRegistryId,
            issuer,
          )
        ).toJSON(),
      ).toEqual({
        suspended: true,
        delegated: [],
      });
    }
  });

  it('Updates delegated issuers in the existing Trust Registry', async () => {
    const trustRegistryId = randomAsHex(32);
    const schemaId = randomAsHex(32);

    await dock.trustRegistry.initOrUpdate(
      convenerDID,
      trustRegistryId,
      'Test Registry',
      'Gov framework',
      convenerPair,
      dock,
    );

    const schemaIssuers = new BTreeMap();
    const schemaIssuerPrices = new BTreeMap();
    schemaIssuerPrices.set('A', 20);

    schemaIssuers.set(issuerDID, schemaIssuerPrices);
    schemaIssuers.set(issuerDID2, schemaIssuerPrices);

    const schemas = new BTreeMap();
    schemas.set(schemaId, {
      Set: {
        issuers: schemaIssuers,
      },
    });

    await dock.trustRegistry.setSchemasMetadata(
      convenerDID,
      trustRegistryId,
      { Modify: schemas },
      convenerPair,
      dock,
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistryIssuerConfigurations(
          trustRegistryId,
          issuerDID,
        )
      ).toJSON(),
    ).toEqual({
      suspended: false,
      delegated: [],
    });

    const issuers = new BTreeSet();
    issuers.add(issuerDID2);

    await dock.trustRegistry.updateDelegatedIssuers(
      issuerDID,
      trustRegistryId,
      { Set: issuers },
      issuerPair,
      dock,
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistryIssuerConfigurations(
          trustRegistryId,
          issuerDID,
        )
      ).toJSON(),
    ).toEqual({
      suspended: false,
      delegated: [issuerDID2],
    });
  });

  it('Updates schemas metadata in the existing Trust Registry', async () => {
    const trustRegistryId = randomAsHex(32);
    const schemaId = randomAsHex(32);

    await dock.trustRegistry.initOrUpdate(
      convenerDID,
      trustRegistryId,
      'Test Registry',
      'Gov framework',
      convenerPair,
      dock,
    );

    const verifiers = new BTreeSet();
    verifiers.add(verifierDID);
    verifiers.add(verifierDID2);
    verifiers.add(verifierDIDMethodKey);

    let issuers = new BTreeMap();
    let issuerPrices = new BTreeMap();
    issuerPrices.set('A', 20);
    let issuer2Prices = new BTreeMap();
    issuer2Prices.set('A', 20);

    issuers.set(issuerDID, issuerPrices);
    issuers.set(issuerDID2, issuer2Prices);

    const schemas = new BTreeMap();
    schemas.set(schemaId, {
      issuers,
      verifiers,
    });

    let schemasUpdate = new BTreeMap();
    schemasUpdate.set(schemaId, {
      Add: {
        issuers,
        verifiers,
      },
    });

    await dock.trustRegistry.setSchemasMetadata(
      convenerDID,
      trustRegistryId,
      { Modify: schemasUpdate },
      convenerPair,
      dock,
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId,
        )
      ).toJSON(),
    ).toEqual({
      issuers: expectedFormattedIssuers(issuers),
      verifiers: expectedFormattedVerifiers(verifiers),
    });

    schemasUpdate = new BTreeMap();

    issuers = new BTreeMap();
    issuerPrices = new BTreeMap();
    issuerPrices.set('A', 65);
    issuer2Prices = new BTreeMap();
    issuer2Prices.set('A', 75);

    issuers.set(issuerDID, issuerPrices);
    issuers.set(issuerDID2, issuer2Prices);

    schemasUpdate.set(schemaId, {
      Modify: {
        issuers: {
          Set: issuers,
        },
      },
    });

    await dock.trustRegistry.setSchemasMetadata(
      convenerDID,
      trustRegistryId,
      { Modify: schemasUpdate },
      convenerPair,
      dock,
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId,
        )
      ).toJSON(),
    ).toEqual({
      issuers: expectedFormattedIssuers(issuers),
      verifiers: expectedFormattedVerifiers(verifiers),
    });

    schemasUpdate = new BTreeMap();

    const issuer2PricesUpdate = new BTreeMap();
    issuer2PricesUpdate.set('C', { Add: 25 });
    issuer2PricesUpdate.set('B', { Set: 36 });
    issuer2PricesUpdate.set('A', 'Remove');

    issuer2Prices = new BTreeMap();
    issuer2Prices.set('C', 25);
    issuer2Prices.set('B', 36);

    const issuersUpdate = new BTreeMap();
    issuersUpdate.set(issuerDID2, {
      Modify: issuer2PricesUpdate,
    });

    schemasUpdate.set(schemaId, {
      Modify: {
        issuers: {
          Modify: issuersUpdate,
        },
      },
    });

    issuers = new BTreeMap();
    issuers.set(issuerDID2, issuer2Prices);
    issuers.set(issuerDID, issuerPrices);
    schemas.set(schemaId, {
      issuers,
      verifiers: schemas.get(schemaId).verifiers,
    });

    await dock.trustRegistry.setSchemasMetadata(
      issuerDID2,
      trustRegistryId,
      { Modify: schemasUpdate },
      issuerPair2,
      dock,
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId,
        )
      ).toJSON(),
    ).toEqual({
      issuers: expectedFormattedIssuers(issuers),
      verifiers: expectedFormattedVerifiers(verifiers),
    });

    schemasUpdate = new BTreeMap();
    const verifiersUpdate = new BTreeMap();
    verifiersUpdate.set(verifierDIDMethodKey, 'Remove');

    schemasUpdate.set(schemaId, {
      Modify: {
        verifiers: {
          Modify: verifiersUpdate,
        },
      },
    });

    await dock.trustRegistry.setSchemasMetadata(
      verifierDIDMethodKey,
      trustRegistryId,
      { Modify: schemasUpdate },
      verifierDIDMethodKeyPair,
      dock,
    );

    verifiers.delete(verifierDIDMethodKey);

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId,
        )
      ).toJSON(),
    ).toEqual({
      issuers: expectedFormattedIssuers(issuers),
      verifiers: expectedFormattedVerifiers(verifiers),
    });
  });

  it('Overrides Trust Registry', async () => {
    const trustRegistryId = randomAsHex(32);
    const schemaId = randomAsHex(32);
    const secondSchemaId = randomAsHex(32);
    const thirdSchemaId = randomAsHex(32);

    await dock.trustRegistry.initOrUpdate(
      convenerDID,
      trustRegistryId,
      'Test Registry',
      'Gov framework',
      convenerPair,
      dock,
    );

    const verifiers = new BTreeSet();
    verifiers.add(verifierDID);
    verifiers.add(verifierDID2);
    verifiers.add(verifierDIDMethodKey);

    let issuers = new BTreeMap();
    let issuerPrices = new BTreeMap();
    issuerPrices.set('A', 20);
    let issuer2Prices = new BTreeMap();
    issuer2Prices.set('A', 20);

    const issuerDIDHex = issuerDID;
    issuers.set(issuerDIDHex, issuerPrices);
    issuers.set(issuerDID2, issuer2Prices);

    const schemas = new BTreeMap();
    schemas.set(schemaId, {
      issuers,
      verifiers,
    });

    await dock.trustRegistry.setSchemasMetadata(
      convenerDID,
      trustRegistryId,
      { Set: schemas },
      convenerPair,
      dock,
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId,
        )
      ).toJSON(),
    ).toEqual({
      issuers: expectedFormattedIssuers(schemas.get(schemaId).issuers),
      verifiers: expectedFormattedVerifiers(schemas.get(schemaId).verifiers),
    });

    schemas.get(schemaId).issuers.delete(issuerDIDHex);
    issuers = new BTreeMap();
    issuerPrices = new BTreeMap();
    issuerPrices.set('A', 65);
    issuer2Prices = new BTreeMap();
    issuer2Prices.set('A', 75);

    issuers.set(issuerDIDHex, issuerPrices);
    issuers.set(issuerDID2, issuer2Prices);

    schemas.set(secondSchemaId, {
      issuers,
      verifiers,
    });

    await dock.trustRegistry.setSchemasMetadata(
      convenerDID,
      trustRegistryId,
      { Set: schemas },
      convenerPair,
      dock,
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId,
        )
      ).toJSON(),
    ).toEqual({
      issuers: expectedFormattedIssuers(schemas.get(schemaId).issuers),
      verifiers: expectedFormattedVerifiers(schemas.get(schemaId).verifiers),
    });

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          secondSchemaId,
          trustRegistryId,
        )
      ).toJSON(),
    ).toEqual({
      issuers: expectedFormattedIssuers(schemas.get(secondSchemaId).issuers),
      verifiers: expectedFormattedVerifiers(
        schemas.get(secondSchemaId).verifiers,
      ),
    });
    expect(
      (
        await dock.api.query.trustRegistry.trustRegistriesStoredSchemas(
          trustRegistryId,
        )
      ).toJSON(),
    ).toEqual([schemaId, secondSchemaId].sort());

    schemas.delete(schemaId);
    issuer2Prices = new BTreeMap();
    issuer2Prices.set('C', 25);
    issuer2Prices.set('B', 36);

    issuers = new BTreeMap();
    issuers.set(issuerDID2, issuer2Prices);
    issuers.set(issuerDIDHex, issuerPrices);
    schemas.set(thirdSchemaId, {
      issuers,
      verifiers: schemas.get(secondSchemaId).verifiers,
    });

    await dock.trustRegistry.setSchemasMetadata(
      convenerDID,
      trustRegistryId,
      { Set: schemas },
      convenerPair,
      dock,
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistriesStoredSchemas(
          trustRegistryId,
        )
      ).toJSON(),
    ).toEqual([secondSchemaId, thirdSchemaId].sort());
    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId,
        )
      ).toJSON(),
    ).toEqual(null);
    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          secondSchemaId,
          trustRegistryId,
        )
      ).toJSON(),
    ).toEqual({
      issuers: expectedFormattedIssuers(schemas.get(secondSchemaId).issuers),
      verifiers: expectedFormattedVerifiers(
        schemas.get(secondSchemaId).verifiers,
      ),
    });
    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          thirdSchemaId,
          trustRegistryId,
        )
      ).toJSON(),
    ).toEqual({
      issuers: expectedFormattedIssuers(schemas.get(thirdSchemaId).issuers),
      verifiers: expectedFormattedVerifiers(
        schemas.get(thirdSchemaId).verifiers,
      ),
    });

    await dock.trustRegistry.setSchemasMetadata(
      convenerDID,
      trustRegistryId,
      { Set: new BTreeMap() },
      convenerPair,
      dock,
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistriesStoredSchemas(
          trustRegistryId,
        )
      ).toJSON(),
    ).toEqual([]);

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId,
        )
      ).toJSON(),
    ).toEqual(null);

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          secondSchemaId,
          trustRegistryId,
        )
      ).toJSON(),
    ).toEqual(null);

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          thirdSchemaId,
          trustRegistryId,
        )
      ).toJSON(),
    ).toEqual(null);
  });
});

function expectedFormattedIssuers(issuers) {
  return Object.fromEntries(
    [...issuers.entries()].map(([issuer, prices]) => [
      JSON.stringify(
        issuer.isDid
          ? { did: issuer.asDid }
          : { didMethodKey: issuer.asDidMethodKey },
      ),
      Object.fromEntries([...prices.entries()]),
    ]),
  );
}

function expectedFormattedVerifiers(verifiers) {
  return [...verifiers.values()]
    .map((verifier) => (verifier.isDid
      ? { did: verifier.asDid }
      : { didMethodKey: verifier.asDidMethodKey }))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}
