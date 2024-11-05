import {
  randomAsHex,
  u8aToHex,
  stringToU8a,
} from "@docknetwork/credential-sdk/utils";

import { DockAPI } from "@docknetwork/dock-blockchain-api";

import {
  FullNodeEndpoint,
  TestKeyringOpts,
  TestAccountURI,
  DisableTrustRegistryParticipantsTests,
} from "../test-constants";

import { DidMethodKey, DockDid } from "@docknetwork/credential-sdk/types";
import { registerNewDIDUsingPair } from "./helpers";
import {
  Ed25519Keypair,
  DidKeypair,
} from "@docknetwork/credential-sdk/keypairs";
import {
  IssuersSet,
  TrustRegistryInfo,
  DockTrustRegistryId,
} from "@docknetwork/credential-sdk/types/trust-registry";
import { maybeToJSON } from "@docknetwork/credential-sdk/utils";
import { DockCoreModules } from "../../src";

describe("Trust Registry", () => {
  const dock = new DockAPI();
  const modules = new DockCoreModules(dock);

  // Create a new convener DID, the DID will be registered on the network and own the trust registry
  const convenerDID = DockDid.random();
  const ownerSeed = randomAsHex(32);
  const convenerPair = new DidKeypair(
    [convenerDID, 1],
    new Ed25519Keypair(ownerSeed)
  );

  const issuerDID = DockDid.random();
  const issuerSeed = randomAsHex(32);
  const issuerPair = new DidKeypair(
    [issuerDID, 1],
    new Ed25519Keypair(issuerSeed)
  );

  const issuerDID2 = DockDid.random();
  const issuerSeed2 = randomAsHex(32);
  const issuerPair2 = new DidKeypair(
    [issuerDID2, 1],
    new Ed25519Keypair(issuerSeed2)
  );

  const verifierDID = DockDid.random();
  const verifierSeed = randomAsHex(32);
  const verifierPair = new DidKeypair(
    [verifierDID, 1],
    new Ed25519Keypair(verifierSeed)
  );

  const verifierDID2 = DockDid.random();
  const verifierSeed2 = randomAsHex(32);
  const verifierPair2 = new DidKeypair(
    [verifierDID2, 1],
    new Ed25519Keypair(verifierSeed2)
  );

  const verifierDIDMethodKeySeed = randomAsHex(32);

  const verifierDIDMethodKeyPair = new Ed25519Keypair(verifierDIDMethodKeySeed);
  const verifierDIDMethodKey = DidMethodKey.fromKeypair(
    verifierDIDMethodKeyPair
  );

  const createRegistry = async (
    name = "Test Registry",
    govFramework = "Gov framework",
    convener = [convenerDID, convenerPair],
    participantDidsWithKeys = [
      [issuerDID, issuerPair],
      [issuerDID2, issuerPair2],
      [verifierDID, verifierPair],
      [verifierDID2, verifierPair2],
      [verifierDIDMethodKey, verifierDIDMethodKeyPair],
    ]
  ) => {
    const trustRegistryId = DockTrustRegistryId.random();

    expect(
      (await dock.api.query.trustRegistry.trustRegistriesInfo(trustRegistryId))
        .isNone
    ).toEqual(true);

    await modules.trustRegistry.createRegistry(
      trustRegistryId,
      new TrustRegistryInfo(name, govFramework, convener[0]),
      new Map(),
      convener[1]
    );

    if (!DisableTrustRegistryParticipantsTests) {
      const participants = new Map();

      for (const [did, _] of participantDidsWithKeys) {
        participants.set(did, "Add");
      }

      const sigs = await Promise.all(
        [...participantDidsWithKeys, convener].map(([did, signingKeyRef]) =>
          modules.trustRegistry.dockOnly.signChangeParticipants(
            did,
            trustRegistryId,
            participants,
            signingKeyRef
          )
        )
      );

      await modules.trustRegistry.dockOnly.changeParticipants(
        trustRegistryId,
        participants,
        sigs
      );
    }

    return trustRegistryId;
  };

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });

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
    await modules.did.dockOnly.newDidMethodKey(verifierDIDMethodKey);
  }, 40000);

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);

  it("Creates, updates trust registry and queries data", async () => {
    const trustRegistryId = await createRegistry();

    const registry = (
      await modules.trustRegistry.getRegistry(trustRegistryId)
    ).toJSON();
    expect(registry).toEqual({
      info: {
        convener: convenerDID.toJSON(),
        name: "Test Registry",
        govFramework: "Gov framework",
      },
      schemas: [],
    });

    const registries = (
      await modules.trustRegistry.getAllRegistriesByDid(convenerDID)
    ).toJSON();

    expect(registries).toEqual([
      [
        String(trustRegistryId),
        {
          info: {
            convener: convenerDID.toJSON(),
            name: "Test Registry",
            govFramework: "Gov framework",
          },
          schemas: [],
        },
      ],
    ]);
  });

  it("Initializes Trust Registry", async () => {
    const trustRegistryId = await createRegistry();

    const registryInfo = (
      await dock.api.query.trustRegistry.trustRegistriesInfo(trustRegistryId)
    ).toJSON();
    expect(registryInfo).toEqual({
      convener: convenerDID.toJSON(),
      name: "Test Registry",
      govFramework: u8aToHex(stringToU8a("Gov framework")),
    });
  });

  it("Fetches information about all trust registries/schemas metadata where given issuer/verifier exists", async () => {
    const trustRegistryId = await createRegistry();
    const trustRegistryId2 = await createRegistry("Test Registry 2");
    const schemaId = randomAsHex(32);
    const schemaId2 = randomAsHex(32);

    const verifiers = new Set();
    verifiers.add(verifierDID);
    verifiers.add(verifierDID2);

    const issuers = new Map();
    const issuerPrices = new Map();
    issuerPrices.set("A", 20);
    const issuer2Prices = new Map();
    issuer2Prices.set("A", 20);

    issuers.set(issuerDID, issuerPrices);
    issuers.set(issuerDID2, issuer2Prices);

    const schemas = new Map();
    schemas.set(schemaId, {
      issuers,
      verifiers,
    });

    const schema2Issuers = new Map();
    const schema2IssuerPrices = new Map();

    schema2IssuerPrices.set("C", 40);
    schema2Issuers.set(issuerDID, schema2IssuerPrices);
    schemas.set(schemaId2, {
      issuers: schema2Issuers,
    });

    await modules.trustRegistry.dockOnly.setSchemasMetadata(
      convenerDID,
      trustRegistryId,
      { Set: schemas },
      convenerPair
    );

    expect(
      (
        await dock.api.query.trustRegistry.verifiersTrustRegistries(
          verifierDIDMethodKey
        )
      ).toJSON()
    ).toEqual([]);
    expect(
      (
        await dock.api.query.trustRegistry.issuersTrustRegistries(issuerDID)
      ).toJSON()
    ).toEqual([trustRegistryId.toJSON()]);
    expect(
      (
        await dock.api.query.trustRegistry.verifiersTrustRegistries(
          verifierDID2
        )
      ).toJSON()
    ).toEqual([trustRegistryId.toJSON()]);

    await modules.trustRegistry.dockOnly.setSchemasMetadata(
      convenerDID,
      trustRegistryId2,
      { Set: schemas },
      convenerPair
    );

    expect(
      (
        await dock.api.query.trustRegistry.verifiersTrustRegistries(
          verifierDIDMethodKey
        )
      ).toJSON()
    ).toEqual([]);
    expect(
      (
        await dock.api.query.trustRegistry.issuersTrustRegistries(issuerDID)
      ).toJSON()
    ).toEqual([trustRegistryId.toJSON(), trustRegistryId2.toJSON()].sort());
    expect(
      (
        await dock.api.query.trustRegistry.verifiersTrustRegistries(
          verifierDID2
        )
      ).toJSON()
    ).toEqual([trustRegistryId.toJSON(), trustRegistryId2.toJSON()].sort());

    verifiers.add(verifierDIDMethodKey);

    await modules.trustRegistry.dockOnly.setSchemasMetadata(
      convenerDID,
      trustRegistryId2,
      { Set: schemas },
      convenerPair
    );

    expect(
      (
        await dock.api.query.trustRegistry.verifiersTrustRegistries(
          verifierDIDMethodKey
        )
      ).toJSON()
    ).toEqual([trustRegistryId2.toJSON()]);

    const RegInfo = {
      [trustRegistryId]: {
        convener: convenerDID.toQualifiedEncodedString(),
        name: "Test Registry",
        govFramework: u8aToHex(stringToU8a("Gov framework")),
      },
    };
    const Reg2Info = {
      [trustRegistryId2.toJSON()]: {
        convener: convenerDID.toQualifiedEncodedString(),
        name: "Test Registry 2",
        govFramework: u8aToHex(stringToU8a("Gov framework")),
      },
    };
    const BothRegsInfo =
      String(trustRegistryId).localeCompare(String(trustRegistryId2)) >= 0
        ? { ...RegInfo, ...Reg2Info }
        : { ...Reg2Info, ...RegInfo };

    expect(
      await modules.trustRegistry.dockOnly.registriesInfo({
        verifiers: {
          AnyOf: [verifierDIDMethodKey],
        },
      })
    ).toEqual(Reg2Info);
    expect(
      await modules.trustRegistry.dockOnly.registriesInfo({
        issuers: {
          AnyOf: [verifierDIDMethodKey],
        },
      })
    ).toEqual({});
    expect(
      await modules.trustRegistry.dockOnly.registriesInfo({
        issuersOrVerifiers: {
          AnyOf: [verifierDIDMethodKey],
        },
      })
    ).toEqual(Reg2Info);
    expect(
      await modules.trustRegistry.dockOnly.registriesInfo({
        issuers: {
          AnyOf: [verifierDIDMethodKey],
        },
        verifiers: {
          AnyOf: [verifierDIDMethodKey],
        },
      })
    ).toEqual({});
    expect(
      await modules.trustRegistry.dockOnly.registriesInfo({
        schemaIds: { AnyOf: [schemaId] },
      })
    ).toEqual(BothRegsInfo);

    expect(
      await modules.trustRegistry.dockOnly.registriesInfo({
        schemaIds: {
          AnyOf: [schemaId],
        },
        verifiers: {
          AnyOf: [verifierDID],
        },
      })
    ).toEqual(BothRegsInfo);
    expect(
      await modules.trustRegistry.dockOnly.registriesInfo({
        schemaIds: {
          AnyOf: [schemaId],
        },
        verifiers: {
          AnyOf: [verifierDID],
        },
        issuers: {
          AnyOf: [verifierDID],
        },
      })
    ).toEqual({});
    expect(
      await modules.trustRegistry.dockOnly.registriesInfo({
        schemaIds: {
          AnyOf: [schemaId],
        },
        issuersOrVerifiers: {
          AnyOf: [verifierDID, issuerDID2],
        },
      })
    ).toEqual(BothRegsInfo);

    const schema1MetadataInTrustRegistry1 =
      modules.trustRegistry.dockOnly.parseSchemaMetadata({
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
    const schema1MetadataInTrustRegistry2 =
      modules.trustRegistry.dockOnly.parseSchemaMetadata({
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
    const schema2MetadataInTrustRegistry1 =
      modules.trustRegistry.dockOnly.parseSchemaMetadata({
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
      await modules.trustRegistry.dockOnly.registrySchemasMetadata(
        {
          verifiers: { AnyOf: [verifierDIDMethodKey] },
        },
        trustRegistryId2
      )
    ).toEqual({ [schemaId]: schema1MetadataInTrustRegistry2 });
    expect(
      await modules.trustRegistry.dockOnly.registrySchemasMetadata(
        {
          issuersOrVerifiers: { AnyOf: [verifierDIDMethodKey] },
        },
        trustRegistryId2
      )
    ).toEqual({ [schemaId]: schema1MetadataInTrustRegistry2 });
    expect(
      await modules.trustRegistry.dockOnly.registrySchemasMetadata(
        {
          issuers: { AnyOf: [verifierDIDMethodKey] },
        },
        trustRegistryId
      )
    ).toEqual({});
    expect(
      await modules.trustRegistry.dockOnly.registrySchemasMetadata(
        {
          issuers: {
            AnyOf: [verifierDIDMethodKey, issuerDID],
          },
        },
        trustRegistryId
      )
    ).toEqual({
      [schemaId]: schema1MetadataInTrustRegistry1,
      [schemaId2]: schema2MetadataInTrustRegistry1,
    });
    expect(
      await modules.trustRegistry.dockOnly.registrySchemasMetadata(
        {
          issuersOrVerifiers: { AnyOf: [verifierDIDMethodKey] },
        },
        trustRegistryId
      )
    ).toEqual({});
    expect(
      await modules.trustRegistry.dockOnly.registrySchemasMetadata(
        {
          issuers: { AnyOf: [issuerDID] },
          verifiers: { AnyOf: [verifierDIDMethodKey] },
        },
        trustRegistryId2
      )
    ).toEqual({ [schemaId]: schema1MetadataInTrustRegistry2 });
    expect(
      await modules.trustRegistry.dockOnly.registrySchemasMetadata(
        {
          schemaIds: [schemaId],
        },
        trustRegistryId
      )
    ).toEqual({ [schemaId]: schema1MetadataInTrustRegistry1 });
    expect(
      await modules.trustRegistry.dockOnly.registrySchemasMetadata(
        {
          issuers: {
            AnyOf: [issuerDID, issuerDID2],
          },
          schemaIds: [schemaId],
        },
        trustRegistryId
      )
    ).toEqual({ [schemaId]: schema1MetadataInTrustRegistry1 });
    expect(
      await modules.trustRegistry.dockOnly.registrySchemasMetadata({
        issuers: { AnyOf: [verifierDID] },
        schemaIds: [schemaId2],
      })
    ).toEqual({});

    expect(
      await modules.trustRegistry.dockOnly.schemaMetadataInRegistry(
        schemaId,
        trustRegistryId
      )
    ).toEqual(schema1MetadataInTrustRegistry1);
    expect(
      await modules.trustRegistry.dockOnly.schemaIssuersInRegistry(
        schemaId,
        trustRegistryId
      )
    ).toEqual(schema1MetadataInTrustRegistry1.issuers);
    expect(
      await modules.trustRegistry.dockOnly.schemaVerifiersInRegistry(
        schemaId,
        trustRegistryId
      )
    ).toEqual(schema1MetadataInTrustRegistry1.verifiers);

    expect(
      await modules.trustRegistry.dockOnly.schemaMetadata(schemaId)
    ).toEqual(
      modules.trustRegistry.dockOnly.parseMapEntries(
        String,
        modules.trustRegistry.dockOnly.parseSchemaMetadata,
        new Map([
          [trustRegistryId, schema1MetadataInTrustRegistry1],
          [trustRegistryId2, schema1MetadataInTrustRegistry2],
        ])
      )
    );
    expect(
      await modules.trustRegistry.dockOnly.schemaVerifiers(schemaId)
    ).toEqual(
      modules.trustRegistry.dockOnly.parseMapEntries(
        String,
        modules.trustRegistry.dockOnly.parseSchemaVerifiers,
        new Map([
          [trustRegistryId, [verifierDID, verifierDID2]],
          [trustRegistryId2, [verifierDID, verifierDID2, verifierDIDMethodKey]],
        ])
      )
    );
    expect(
      await modules.trustRegistry.dockOnly.schemaIssuers(schemaId)
    ).toEqual(
      modules.trustRegistry.dockOnly.parseMapEntries(
        String,
        modules.trustRegistry.dockOnly.parseSchemaIssuers,
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
        ])
      )
    );
  });

  it("Adds schemas metadata to the existing Trust Registry", async () => {
    const trustRegistryId = await createRegistry();
    const schemaId = randomAsHex(32);
    const otherSchemaId = randomAsHex(32);

    const verifiers = new Set();
    verifiers.add(verifierDID);
    verifiers.add(verifierDID2);
    verifiers.add(verifierDIDMethodKey);

    const issuers = new Map();
    const issuerPrices = new Map();
    issuerPrices.set("A", 20);
    const issuer2Prices = new Map();
    issuer2Prices.set("A", 20);

    issuers.set(issuerDID, issuerPrices);
    issuers.set(issuerDID2, issuer2Prices);

    const schemas = new Map();
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

    await modules.trustRegistry.dockOnly.setSchemasMetadata(
      convenerDID,
      trustRegistryId,
      { Modify: schemas },
      convenerPair
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId
        )
      ).toJSON()
    ).toEqual({
      issuers: expectedFormattedIssuers(issuers),
      verifiers: expectedFormattedVerifiers(verifiers),
    });
    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          otherSchemaId,
          trustRegistryId
        )
      ).toJSON()
    ).toEqual({
      issuers: expectedFormattedIssuers(issuers),
      verifiers: expectedFormattedVerifiers(new Set()),
    });
  });

  it("Removes schemas metadata from the Trust Registry", async () => {
    const trustRegistryId = await createRegistry();
    const schemaId = randomAsHex(32);
    const otherSchemaId = randomAsHex(32);

    const verifiers = new Set();
    verifiers.add(verifierDID);
    verifiers.add(verifierDID2);
    verifiers.add(verifierDIDMethodKey);

    const issuers = new Map();
    const issuerPrices = new Map();
    issuerPrices.set("A", 20);
    const issuer2Prices = new Map();
    issuer2Prices.set("A", 20);

    issuers.set(issuerDID, issuerPrices);
    issuers.set(issuerDID2, issuer2Prices);

    let schemas = new Map();
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

    await modules.trustRegistry.dockOnly.setSchemasMetadata(
      convenerDID,
      trustRegistryId,
      { Modify: schemas },
      convenerPair
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId
        )
      ).toJSON()
    ).toEqual({
      issuers: expectedFormattedIssuers(issuers),
      verifiers: expectedFormattedVerifiers(verifiers),
    });
    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          otherSchemaId,
          trustRegistryId
        )
      ).toJSON()
    ).toEqual({
      issuers: expectedFormattedIssuers(issuers),
      verifiers: expectedFormattedVerifiers(new Set()),
    });

    schemas = new Map();
    schemas.set(schemaId, "Remove");
    schemas.set(otherSchemaId, "Remove");

    await modules.trustRegistry.dockOnly.setSchemasMetadata(
      convenerDID,
      trustRegistryId,
      { Modify: schemas },
      convenerPair
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId
        )
      ).toJSON()
    ).toEqual(null);
    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          otherSchemaId,
          trustRegistryId
        )
      ).toJSON()
    ).toEqual(null);
  });

  it("Changes participant information", async () => {
    if (DisableTrustRegistryParticipantsTests) {
      return;
    }

    const trustRegistryId = await createRegistry();
    const participant = issuerDID;

    expect(
      await modules.trustRegistry.dockOnly.registryParticipantsInfo(
        trustRegistryId,
        [participant]
      )
    ).toEqual({ [participant]: null });

    const information = {
      orgName: "Org Name",
      logo: "Logo",
      description: "Description",
    };

    const sigs = await Promise.all(
      [
        [issuerDID, issuerPair],
        [convenerDID, convenerPair],
      ].map(([did, signingKeyRef]) =>
        modules.trustRegistry.dockOnly.signSetParticipantInformation(
          did,
          trustRegistryId,
          participant,
          information,
          signingKeyRef
        )
      )
    );

    await modules.trustRegistry.dockOnly.setParticipantInformation(
      trustRegistryId,
      participant,
      information,
      sigs
    );

    expect(
      await modules.trustRegistry.dockOnly.registryParticipantsInfo(
        trustRegistryId,
        [participant]
      )
    ).toEqual({ [participant]: information });
  });

  it("Changes issuer information", async () => {
    const trustRegistryId = await createRegistry();
    const schemaId = randomAsHex(32);

    const verifiers = new Set();
    verifiers.add(verifierDID);
    verifiers.add(verifierDID2);
    verifiers.add(verifierDIDMethodKey);

    const issuers = new Map();
    const issuerPrices = new Map();
    issuerPrices.set("A", 20);
    const issuer2Prices = new Map();
    issuer2Prices.set("A", 20);

    issuers.set(issuerDID, issuerPrices);
    issuers.set(issuerDID2, issuer2Prices);

    const schemas = new Map();
    schemas.set(schemaId, {
      Set: {
        issuers,
        verifiers,
      },
    });

    await modules.trustRegistry.dockOnly.setSchemasMetadata(
      convenerDID,
      trustRegistryId,
      { Modify: schemas },
      convenerPair
    );

    await modules.trustRegistry.dockOnly.suspendIssuers(
      convenerDID,
      trustRegistryId,
      [issuerDID, issuerDID2],
      convenerPair
    );

    for (const issuer of [issuerDID, issuerDID2]) {
      expect(
        (
          await dock.api.query.trustRegistry.trustRegistryIssuerConfigurations(
            trustRegistryId,
            issuer
          )
        ).toJSON()
      ).toEqual({
        suspended: true,
        delegated: [],
      });
    }

    await modules.trustRegistry.dockOnly.unsuspendIssuers(
      convenerDID,
      trustRegistryId,
      [issuerDID],
      convenerPair
    );

    for (const issuer of [issuerDID]) {
      expect(
        (
          await dock.api.query.trustRegistry.trustRegistryIssuerConfigurations(
            trustRegistryId,
            issuer
          )
        ).toJSON()
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
            issuer
          )
        ).toJSON()
      ).toEqual({
        suspended: true,
        delegated: [],
      });
    }
  });

  it("Updates delegated issuers", async () => {
    const trustRegistryId = await createRegistry();
    const schemaId = randomAsHex(32);

    const schemaIssuers = new Map();
    const schemaIssuerPrices = new Map();
    schemaIssuerPrices.set("A", 20);

    schemaIssuers.set(issuerDID, schemaIssuerPrices);
    schemaIssuers.set(issuerDID2, schemaIssuerPrices);

    const schemas = new Map();
    schemas.set(schemaId, {
      Set: {
        issuers: schemaIssuers,
      },
    });

    await modules.trustRegistry.dockOnly.setSchemasMetadata(
      convenerDID,
      trustRegistryId,
      { Modify: schemas },
      convenerPair
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistryIssuerConfigurations(
          trustRegistryId,
          issuerDID
        )
      ).toJSON()
    ).toEqual({
      suspended: false,
      delegated: [],
    });

    const issuers = new IssuersSet();
    issuers.add(issuerDID2);

    await modules.trustRegistry.dockOnly.updateDelegatedIssuers(
      issuerDID,
      trustRegistryId,
      { Set: issuers },
      issuerPair
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistryIssuerConfigurations(
          trustRegistryId,
          issuerDID
        )
      ).toJSON()
    ).toEqual({
      suspended: false,
      delegated: [issuerDID2.toJSON()],
    });
  });

  it("Updates schemas metadata", async () => {
    const trustRegistryId = await createRegistry();
    const schemaId = randomAsHex(32);

    const verifiers = new Set();
    verifiers.add(verifierDID);
    verifiers.add(verifierDID2);
    verifiers.add(verifierDIDMethodKey);

    let issuers = new Map();
    let issuerPrices = new Map();
    issuerPrices.set("A", 20);
    let issuer2Prices = new Map();
    issuer2Prices.set("A", 20);

    issuers.set(issuerDID, issuerPrices);
    issuers.set(issuerDID2, issuer2Prices);

    const schemas = new Map();
    schemas.set(schemaId, {
      issuers,
      verifiers,
    });

    let schemasUpdate = new Map();
    schemasUpdate.set(schemaId, {
      Add: {
        issuers,
        verifiers,
      },
    });

    await modules.trustRegistry.dockOnly.setSchemasMetadata(
      convenerDID,
      trustRegistryId,
      { Modify: schemasUpdate },
      convenerPair
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId
        )
      ).toJSON()
    ).toEqual({
      issuers: expectedFormattedIssuers(issuers),
      verifiers: expectedFormattedVerifiers(verifiers),
    });

    schemasUpdate = new Map();

    issuers = new Map();
    issuerPrices = new Map();
    issuerPrices.set("A", 65);
    issuer2Prices = new Map();
    issuer2Prices.set("A", 75);

    issuers.set(issuerDID, issuerPrices);
    issuers.set(issuerDID2, issuer2Prices);

    schemasUpdate.set(schemaId, {
      Modify: {
        issuers: {
          Set: issuers,
        },
      },
    });

    await modules.trustRegistry.dockOnly.setSchemasMetadata(
      convenerDID,
      trustRegistryId,
      { Modify: schemasUpdate },
      convenerPair
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId
        )
      ).toJSON()
    ).toEqual({
      issuers: expectedFormattedIssuers(issuers),
      verifiers: expectedFormattedVerifiers(verifiers),
    });

    schemasUpdate = new Map();

    const issuer2PricesUpdate = new Map();
    issuer2PricesUpdate.set("C", { Add: 25 });
    issuer2PricesUpdate.set("B", { Set: 36 });
    issuer2PricesUpdate.set("A", "Remove");

    issuer2Prices = new Map();
    issuer2Prices.set("C", 25);
    issuer2Prices.set("B", 36);

    const issuersUpdate = new Map();
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

    issuers = new Map();
    issuers.set(issuerDID2, issuer2Prices);
    issuers.set(issuerDID, issuerPrices);
    schemas.set(schemaId, {
      issuers,
      verifiers: schemas.get(schemaId).verifiers,
    });

    await modules.trustRegistry.dockOnly.setSchemasMetadata(
      issuerDID2,
      trustRegistryId,
      { Modify: schemasUpdate },
      issuerPair2
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId
        )
      ).toJSON()
    ).toEqual({
      issuers: expectedFormattedIssuers(issuers),
      verifiers: expectedFormattedVerifiers(verifiers),
    });

    schemasUpdate = new Map();
    const verifiersUpdate = new Map();
    verifiersUpdate.set(verifierDIDMethodKey, "Remove");

    schemasUpdate.set(schemaId, {
      Modify: {
        verifiers: {
          Modify: verifiersUpdate,
        },
      },
    });

    await modules.trustRegistry.dockOnly.setSchemasMetadata(
      verifierDIDMethodKey,
      trustRegistryId,
      { Modify: schemasUpdate },
      verifierDIDMethodKeyPair
    );

    verifiers.delete(verifierDIDMethodKey);

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId
        )
      ).toJSON()
    ).toEqual({
      issuers: expectedFormattedIssuers(issuers),
      verifiers: expectedFormattedVerifiers(verifiers),
    });
  });

  it("Overrides Trust Registry", async () => {
    const trustRegistryId = await createRegistry();
    const schemaId = randomAsHex(32);
    const secondSchemaId = randomAsHex(32);
    const thirdSchemaId = randomAsHex(32);

    const verifiers = new Set();
    verifiers.add(verifierDID);
    verifiers.add(verifierDID2);
    verifiers.add(verifierDIDMethodKey);

    let issuers = new Map();
    let issuerPrices = new Map();
    issuerPrices.set("A", 20);
    let issuer2Prices = new Map();
    issuer2Prices.set("A", 20);

    const issuerDIDHex = issuerDID;
    issuers.set(issuerDIDHex, issuerPrices);
    issuers.set(issuerDID2, issuer2Prices);

    const schemas = new Map();
    schemas.set(schemaId, {
      issuers,
      verifiers,
    });

    await modules.trustRegistry.dockOnly.setSchemasMetadata(
      convenerDID,
      trustRegistryId,
      { Set: schemas },
      convenerPair
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId
        )
      ).toJSON()
    ).toEqual({
      issuers: expectedFormattedIssuers(schemas.get(schemaId).issuers),
      verifiers: expectedFormattedVerifiers(schemas.get(schemaId).verifiers),
    });

    schemas.get(schemaId).issuers.delete(issuerDIDHex);
    issuers = new Map();
    issuerPrices = new Map();
    issuerPrices.set("A", 65);
    issuer2Prices = new Map();
    issuer2Prices.set("A", 75);

    issuers.set(issuerDIDHex, issuerPrices);
    issuers.set(issuerDID2, issuer2Prices);

    schemas.set(secondSchemaId, {
      issuers,
      verifiers,
    });

    await modules.trustRegistry.dockOnly.setSchemasMetadata(
      convenerDID,
      trustRegistryId,
      { Set: schemas },
      convenerPair
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId
        )
      ).toJSON()
    ).toEqual({
      issuers: expectedFormattedIssuers(schemas.get(schemaId).issuers),
      verifiers: expectedFormattedVerifiers(schemas.get(schemaId).verifiers),
    });

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          secondSchemaId,
          trustRegistryId
        )
      ).toJSON()
    ).toEqual({
      issuers: expectedFormattedIssuers(schemas.get(secondSchemaId).issuers),
      verifiers: expectedFormattedVerifiers(
        schemas.get(secondSchemaId).verifiers
      ),
    });
    expect(
      (
        await dock.api.query.trustRegistry.trustRegistriesStoredSchemas(
          trustRegistryId
        )
      ).toJSON()
    ).toEqual([schemaId, secondSchemaId].sort());

    schemas.delete(schemaId);
    issuer2Prices = new Map();
    issuer2Prices.set("C", 25);
    issuer2Prices.set("B", 36);

    issuers = new Map();
    issuers.set(issuerDID2, issuer2Prices);
    issuers.set(issuerDIDHex, issuerPrices);
    schemas.set(thirdSchemaId, {
      issuers,
      verifiers: schemas.get(secondSchemaId).verifiers,
    });

    await modules.trustRegistry.dockOnly.setSchemasMetadata(
      convenerDID,
      trustRegistryId,
      { Set: schemas },
      convenerPair
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistriesStoredSchemas(
          trustRegistryId
        )
      ).toJSON()
    ).toEqual([secondSchemaId, thirdSchemaId].sort());
    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId
        )
      ).toJSON()
    ).toEqual(null);
    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          secondSchemaId,
          trustRegistryId
        )
      ).toJSON()
    ).toEqual({
      issuers: expectedFormattedIssuers(schemas.get(secondSchemaId).issuers),
      verifiers: expectedFormattedVerifiers(
        schemas.get(secondSchemaId).verifiers
      ),
    });
    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          thirdSchemaId,
          trustRegistryId
        )
      ).toJSON()
    ).toEqual({
      issuers: expectedFormattedIssuers(schemas.get(thirdSchemaId).issuers),
      verifiers: expectedFormattedVerifiers(
        schemas.get(thirdSchemaId).verifiers
      ),
    });

    await modules.trustRegistry.dockOnly.setSchemasMetadata(
      convenerDID,
      trustRegistryId,
      {
        Set: new Map(),
      },
      convenerPair
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistriesStoredSchemas(
          trustRegistryId
        )
      ).toJSON()
    ).toEqual([]);

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId
        )
      ).toJSON()
    ).toEqual(null);

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          secondSchemaId,
          trustRegistryId
        )
      ).toJSON()
    ).toEqual(null);

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          thirdSchemaId,
          trustRegistryId
        )
      ).toJSON()
    ).toEqual(null);
  });
});

function expectedFormattedIssuers(issuers) {
  return Object.fromEntries(
    [...issuers.entries()].map(([issuer, prices]) => [
      JSON.stringify(maybeToJSON(issuer)),
      Object.fromEntries([...prices.entries()]),
    ])
  );
}

function expectedFormattedVerifiers(verifiers) {
  return [...verifiers.values()]
    .map(maybeToJSON)
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}
