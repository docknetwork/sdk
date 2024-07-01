import { randomAsHex } from '@polkadot/util-crypto';
import b58 from 'bs58';
import { hexToU8a, stringToU8a, u8aToHex } from '@polkadot/util';
import {
  initializeWasm,
  BoundCheckSnarkSetup,
  Accumulator,
  PositiveAccumulator,
  dockAccumulatorParams, AccumulatorPublicKey,
  Encoder, BDDT16MacSecretKey, MEM_CHECK_STR, KBUniversalAccumulator,
  MEM_CHECK_KV_STR,
  RevocationStatusProtocol,
} from '@docknetwork/crypto-wasm-ts';
import { InMemoryState, InMemoryKBUniversalState } from '@docknetwork/crypto-wasm-ts/lib/accumulator/in-memory-persistence';
import stringify from 'json-stringify-deterministic';
import { DockAPI } from '../../../src';
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
  Schemes,
} from '../../test-constants';
import { DockDid, DidKeypair } from '../../../src/did';
import { getProofMatcherDoc, registerNewDIDUsingPair } from '../helpers';
import { getKeyDoc } from '../../../src/utils/vc/helpers';
import {
  issueCredential,
  signPresentation,
  verifyPresentation,
  verifyCredential,
} from '../../../src/utils/vc';
import { DockResolver } from '../../../src/resolver';
import { createPresentation } from '../../create-presentation';
import AccumulatorModule, { AccumulatorType } from '../../../src/modules/accumulator';
import { getKeyedProofsFromVerifiedPresentation } from '../../../src/utils/vc/presentations';
import { deepClone } from '../../../src/utils/common';

// TODO: move to fixtures
const id = 'https://ld.dock.io/examples/resident-card-schema.json';
const residentCardSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: id,
  title: 'Resident Card Example',
  type: 'object',
  properties: {
    // TOOD: fix and restore below for future
    // // NOTE: schema here defines context/type to make sure
    // // that the string conversion works even with it defined in schema
    // '@context': {
    //   type: 'array',
    // },
    // type: {
    //   type: 'array',
    // },
    credentialSubject: {
      type: 'object',
      properties: {
        givenName: {
          title: 'Given Name',
          type: 'string',
        },
        familyName: {
          title: 'Family Name',
          type: 'string',
        },
        lprNumber: {
          title: 'LPR Number',
          type: 'integer',
          minimum: 0,
        },
      },
      required: ['givenName', 'familyName', 'lprNumber'],
    },
  },
};

const embeddedSchema = {
  id,
  type: 'JsonSchemaValidator2018',
  details: stringify({ jsonSchema: residentCardSchema }),
};

describe.each(Schemes)('Derived Credentials', ({
  Name,
  Module,
  Presentation,
  CryptoKeyPair,
  VerKey,
  getModule,
  Context,
  derivedToAnoncredsPresentation,
}) => {
  const dock = new DockAPI();
  const resolver = new DockResolver(dock);
  let account;
  let did1;
  let pair1;
  let chainModule;
  let keypair;
  let didDocument;

  const holder3DID = DockDid.random();
  // seed used for 3rd holder keys
  const holder3KeySeed = randomAsHex(32);

  // TODO: move to fixtures
  const credentialJSON = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://w3id.org/citizenship/v1',
      Context,
    ],
    id: 'https://issuer.oidp.uscis.gov/credentials/83627465',
    type: ['VerifiableCredential', 'PermanentResidentCard'],
    credentialSchema: embeddedSchema,
    identifier: '83627465',
    name: 'Permanent Resident Card',
    description: 'Government of Example Permanent Resident Card.',
    issuanceDate: '2019-12-03T12:19:52Z',
    expirationDate: '2029-12-03T12:19:52Z',
    credentialSubject: {
      id: 'did:example:b34ca6cd37bbf23',
      type: ['PermanentResident', 'Person'],
      givenName: 'JOHN',
      familyName: 'SMITH',
      lprNumber: 1234,
    },
  };

  // Setup 4 accumulators, 2 with keyed verification and 2 with public key verification

  const posAccumulatorId = randomAsHex(32);
  const posAccumState = new InMemoryState();
  let posAccumKeypair;
  let posAccumWitness;

  const posKvAccumulatorId = randomAsHex(32);
  const posKvAccumState = new InMemoryState();
  let posKvAccumSecretKey;
  let posKvAccumWitness;

  const uniAccumulatorId = randomAsHex(32);
  const uniAccumState = new InMemoryKBUniversalState();
  let uniAccumKeypair;
  let uniAccumWitness;

  const uniKvAccumulatorId = randomAsHex(32);
  const uniKvAccumState = new InMemoryKBUniversalState();
  let uniKvAccumSecretKey;
  let uniKvAccumWitness;

  let accumMember;
  let encodedMember;

  async function writeAccumToChain(accumId, keyId, accumulator) {
    let accumulated;
    if (accumulator instanceof PositiveAccumulator) {
      accumulated = AccumulatorModule.accumulatedAsHex(accumulator.accumulated);
      await dock.accumulatorModule.addPositiveAccumulator(accumId, accumulated, [did1, keyId], did1, pair1, { didModule: dock.didModule }, false);
    } else {
      accumulated = AccumulatorModule.accumulatedAsHex(accumulator.accumulated, AccumulatorType.KBUni);
      await dock.accumulatorModule.addKBUniversalAccumulator(accumId, accumulated, [did1, keyId], did1, pair1, { didModule: dock.didModule }, false);
    }
    const queriedAccum = await dock.accumulatorModule.getAccumulator(accumId, false);
    expect(queriedAccum.accumulated).toEqual(accumulated);
  }

  beforeAll(async () => {
    await initializeWasm();
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    chainModule = getModule(dock);
    account = dock.keyring.addFromUri(TestAccountURI);

    dock.setAccount(account);
    pair1 = new DidKeypair(dock.keyring.addFromUri(randomAsHex(32)), 1);
    did1 = DockDid.random();
    await registerNewDIDUsingPair(dock, did1, pair1);

    keypair = CryptoKeyPair.generate({
      controller: did1, msgCount: 100,
    });

    if (Name !== 'BDDT16') {
      const pk1 = Module.prepareAddPublicKey(u8aToHex(keypair.publicKeyBuffer));
      await chainModule.addPublicKey(
        pk1,
        did1,
        did1,
        pair1,
        { didModule: dock.did },
        false,
      );

      didDocument = await dock.did.getDocument(did1);
      const { publicKey } = didDocument;
      expect(publicKey.length).toEqual(2);
      expect(publicKey[1].type).toEqual(VerKey);
      keypair.id = publicKey[1].id;
    } else {
      // For KVAC, the public doesn't need to published as its not used in credential or presentation verification (except issuers).
      // But the signer still adds a key identifier in the credential to determine which key will be used for verification
      keypair.id = 'my-key-id';
    }

    // Register holder DID with sr25519 key
    await registerNewDIDUsingPair(
      dock,
      holder3DID,
      new DidKeypair(dock.keyring.addFromUri(holder3KeySeed, null, 'sr25519'), 1),
    );

    const params = dockAccumulatorParams();

    posAccumKeypair = Accumulator.generateKeypair(params);
    const bytes1 = u8aToHex(posAccumKeypair.publicKey.bytes);
    const posAccumPk = AccumulatorModule.prepareAddPublicKey(bytes1);
    await dock.accumulatorModule.addPublicKey(
      posAccumPk,
      did1,
      pair1,
      { didModule: dock.did },
      false,
    );

    // For keyed-verification accumulator, public key is not written on chain.
    const posKvAccumKeypair = Accumulator.generateKeypair(params);

    uniAccumKeypair = Accumulator.generateKeypair(params);
    const bytes2 = u8aToHex(uniAccumKeypair.publicKey.bytes);
    const uniAccumPk = AccumulatorModule.prepareAddPublicKey(bytes2);
    await dock.accumulatorModule.addPublicKey(
      uniAccumPk,
      did1,
      pair1,
      { didModule: dock.did },
      false,
    );

    // For keyed-verification accumulator, public key is not written on chain.
    const uniKvAccumKeypair = Accumulator.generateKeypair(params);

    // All 4 accumulators will have the same member
    accumMember = '10';
    encodedMember = Encoder.defaultEncodeFunc()(accumMember);

    // The 2 positive accumulators are pre-filled with the following members and the other 2 have the domain set to these
    const members = [];
    for (let i = 1; i < 100; i++) {
      // Using default encoder since thats what the is used in credential by default. Ideally, the encoder specified in
      // the particular schema should be used but for that is the default one
      members.push(Encoder.defaultEncodeFunc()(i.toString()));
    }

    const accumulator = PositiveAccumulator.initialize(params, posAccumKeypair.secretKey);
    await accumulator.addBatch(members, posAccumKeypair.secretKey, posAccumState);
    await writeAccumToChain(posAccumulatorId, 1, accumulator);
    posAccumWitness = await accumulator.membershipWitness(encodedMember, posAccumKeypair.secretKey, posAccumState);
    expect(accumulator.verifyMembershipWitness(encodedMember, posAccumWitness, posAccumKeypair.publicKey, params)).toEqual(true);

    const accumulator1 = PositiveAccumulator.initialize(params, posKvAccumKeypair.secretKey);
    await accumulator1.addBatch(members, posKvAccumKeypair.secretKey, posKvAccumState);
    // For KV accumulator, keyId is 0
    await writeAccumToChain(posKvAccumulatorId, 0, accumulator1);
    posKvAccumWitness = await accumulator1.membershipWitness(encodedMember, posKvAccumKeypair.secretKey, posKvAccumState);
    posKvAccumSecretKey = posKvAccumKeypair.secretKey;

    const accumulator2 = await KBUniversalAccumulator.initialize(members, params, uniAccumKeypair.secretKey, uniAccumState);
    await accumulator2.add(encodedMember, uniAccumKeypair.secretKey, uniAccumState);
    await writeAccumToChain(uniAccumulatorId, 2, accumulator2);
    uniAccumWitness = await accumulator2.membershipWitness(encodedMember, uniAccumKeypair.secretKey, uniAccumState);
    expect(accumulator2.verifyMembershipWitness(encodedMember, uniAccumWitness, uniAccumKeypair.publicKey, params)).toEqual(true);

    const accumulator3 = await KBUniversalAccumulator.initialize(members, params, uniKvAccumKeypair.secretKey, uniKvAccumState);
    await accumulator3.add(encodedMember, uniKvAccumKeypair.secretKey, uniKvAccumState);
    // For KV accumulator, keyId is 0
    await writeAccumToChain(uniKvAccumulatorId, 0, accumulator3);
    uniKvAccumWitness = await accumulator3.membershipWitness(encodedMember, uniKvAccumKeypair.secretKey, uniKvAccumState);
    uniKvAccumSecretKey = uniKvAccumKeypair.secretKey;
  }, 30000);

  async function createAndVerifyPresentation(credentials, verifyOptions = {}, accumSecretKey = undefined) {
    const holderKey = getKeyDoc(
      holder3DID,
      new DidKeypair(dock.keyring.addFromUri(holder3KeySeed, null, 'sr25519'), 1),
      'Sr25519VerificationKey2020',
    );

    const presId = `https://example.com/pres/${randomAsHex(32)}`;
    const chal = randomAsHex(32);
    const domain = 'test domain';
    const presentation = createPresentation(credentials, presId);

    // This is done by the verifier
    const reconstructedPres = derivedToAnoncredsPresentation(presentation.verifiableCredential[0]);
    const keyedProofs = getKeyedProofsFromVerifiedPresentation(reconstructedPres);
    const isKvac = Name === 'BDDT16';
    const isKvacStatus = accumSecretKey ? 1 : 0;
    // Keyed proofs only exist for KVAC
    expect(keyedProofs.size).toEqual(isKvac || isKvacStatus ? 1 : 0);
    if (isKvac) {
      // This block is executed by the issuer or anyone having the secret key but not by the verifier
      const sk = new BDDT16MacSecretKey(keypair.privateKeyBuffer);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(keyedProofs.get(0)?.credential?.proof.verify(sk).verified).toEqual(true);
    }
    if (isKvacStatus) {
      // This block is executed by the issuer or anyone having the secret key but not by the verifier
      expect(keyedProofs.get(0)?.status?.proof.verify(accumSecretKey).verified).toEqual(true);
    }

    expect(presentation).toMatchObject(
      // NOTE: json parse+stringify to remove any undefined properties
      expect.objectContaining(JSON.parse(JSON.stringify({
        type: ['VerifiablePresentation'],
        verifiableCredential: credentials,
        id: presId,
      }))),
    );

    // NOTE: typically for BBS+ presentations you shouldnt sign it by the holder, but we do it here just to make sure it works
    // Verifying this would require knowing the holder's public key which makes the holder linkable and defeats the purpose of BBS+
    const signedPres = await signPresentation(
      presentation,
      holderKey,
      chal,
      domain,
      resolver,
    );

    expect(signedPres).toMatchObject(
      expect.objectContaining({
        type: ['VerifiablePresentation'],
        verifiableCredential: credentials,
        id: presId,
        proof: expect.objectContaining({
          type: 'Sr25519Signature2020',
          challenge: chal,
          domain,
          proofPurpose: 'authentication',
        }),
      }),
    );

    const result = await verifyPresentation(signedPres, {
      challenge: chal,
      domain,
      resolver,
      ...verifyOptions,
    });

    expect(result.verified).toBe(true);
    expect(result.presentationResult.verified).toBe(true);
    expect(result.credentialResults.length).toBe(1);
    expect(result.credentialResults[0].verified).toBe(true);
  }

  async function getPresentationInstance(credentialStatus) {
    const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
    const unsignedCred = {
      ...credentialJSON,
      credentialStatus,
      issuer: did1,
    };

    const presentationOptions = {
      nonce: stringToU8a('noncetest'),
      context: 'my context',
    };

    // Create W3C credential
    const credential = await issueCredential(issuerKey, unsignedCred);
    expect(credential.id).toBeDefined();

    // Begin to derive a credential from the above issued one
    const presentationInstance = new Presentation();
    const idx = await presentationInstance.addCredentialToPresent(
      credential,
      { resolver },
    );

    // NOTE: revealing subject type because of JSON-LD processing for this certain credential
    // you may not always need to do this depending on your JSON-LD contexts
    await presentationInstance.addAttributeToReveal(idx, [
      'credentialSubject.type.0',
    ]);
    await presentationInstance.addAttributeToReveal(idx, [
      'credentialSubject.type.1',
    ]);

    return [presentationInstance, presentationOptions];
  }

  test(`For ${Name}, holder creates a derived verifiable credential from a credential with selective disclosure`, async () => {
    const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
    const unsignedCred = {
      ...credentialJSON,
      issuer: did1,
    };

    const presentationOptions = {
      nonce: stringToU8a('noncetest'),
      context: 'my context',
    };

    // Create W3C credential
    const credential = await issueCredential(issuerKey, unsignedCred);
    const result = await verifyCredential(credential, { resolver });
    expect(result).toMatchObject(
      expect.objectContaining(getProofMatcherDoc()),
    );

    // Begin to derive a credential from the above issued one
    const presentationInstance = new Presentation();
    const idx = await presentationInstance.addCredentialToPresent(
      credential,
      { resolver },
    );

    // Reveal subject attributes
    presentationInstance.addAttributeToReveal(idx, [
      'credentialSubject.lprNumber',
    ]);

    // NOTE: revealing subject type because of JSON-LD processing for this certain credential
    // you may not always need to do this depending on your JSON-LD contexts
    presentationInstance.addAttributeToReveal(idx, [
      'credentialSubject.type.0',
    ]);
    presentationInstance.addAttributeToReveal(idx, [
      'credentialSubject.type.1',
    ]);

    // Begin to derive a credential from the above issued one
    const presentationInstance2 = new Presentation();
    const idx2 = await presentationInstance2.addCredentialToPresent(
      credential,
      { resolver },
    );

    // Reveal subject attributes
    presentationInstance2.addAttributeToReveal(idx2, [
      'credentialSubject.lprNumber',
    ]);

    // NOTE: revealing subject type because of JSON-LD processing for this certain credential
    // you may not always need to do this depending on your JSON-LD contexts
    presentationInstance2.addAttributeToReveal(idx2, [
      'credentialSubject.type.0',
    ]);
    presentationInstance2.addAttributeToReveal(idx2, [
      'credentialSubject.type.1',
    ]);

    // Derive a W3C Verifiable Credential JSON from the above presentation
    const credentials = await presentationInstance.deriveCredentials(
      presentationOptions,
    );
    expect(credentials.length).toEqual(1);
    expect(credentials[0].proof).toBeDefined();
    expect(credentials[0]).toHaveProperty('credentialSubject');
    expect(credentials[0].credentialSubject).toMatchObject(
      expect.objectContaining({
        type: unsignedCred.credentialSubject.type,
        lprNumber: 1234,
      }),
    );
    expect(credentials[0].issuer).toEqual(credential.issuer);
    expect(credentials[0].credentialSchema.id).toEqual(residentCardSchema.$id);

    // Ensure reconstructing presentation from credential matches
    // NOTE: ignoring proof here as itll differ when signed twice as above
    const presentation = await presentationInstance2.createPresentation(
      presentationOptions,
    );

    // Question: What is the point of this? A single credential cant be converted to a presentation and a presentation
    // has other data that credential won't have
    const reconstructedPres = derivedToAnoncredsPresentation(credentials[0]);
    expect(reconstructedPres.proof).toBeDefined();
    expect({
      ...reconstructedPres,
      proof: '',
    }).toMatchObject({ ...presentation, proof: '' });

    // Try to verify the derived credential alone
    const credentialResult = await verifyCredential(credentials[0], {
      resolver,
    });
    expect(credentialResult.verified).toBe(true);
    expect(credentialResult.error).toBe(undefined);

    // Modify the credential after issuance, verification should fail
    const modifiedCred = deepClone(credentials[0]);
    modifiedCred.credentialSubject.lprNumber = 0xdeadbeef;
    const credentialResult1 = await verifyCredential(modifiedCred, {
      resolver,
    });
    expect(credentialResult1.verified).toBe(false);

    // This is done by the verifier
    const keyedProofs = getKeyedProofsFromVerifiedPresentation(reconstructedPres);
    const isKvac = Name === 'BDDT16';
    // Keyed proofs only exist for KVAC
    expect(keyedProofs.size).toEqual(isKvac ? 1 : 0);
    if (isKvac) {
      // This block is executed by the issuer or anyone having the secret key but not by the verifier
      const sk = new BDDT16MacSecretKey(keypair.privateKeyBuffer);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(keyedProofs.get(0)?.credential?.proof.verify(sk).verified).toEqual(true);
    }
    // Create a VP and verify it from this credential
    await createAndVerifyPresentation(credentials);
  }, 30000);

  test(`For ${Name}, persist credential status using VB positive accumulator when deriving`, async () => {
    const queriedAccum = await dock.accumulatorModule.getAccumulator(posAccumulatorId, false, true);
    const verifAccumulator = PositiveAccumulator.fromAccumulated(AccumulatorModule.accumulatedFromHex(queriedAccum.accumulated));

    const accumPk = new AccumulatorPublicKey(hexToU8a(queriedAccum.publicKey.bytes));
    expect(verifAccumulator.verifyMembershipWitness(encodedMember, posAccumWitness, accumPk, dockAccumulatorParams())).toEqual(true);

    const credentialStatus = {
      id: `dock:accumulator:${posAccumulatorId}`,
      type: RevocationStatusProtocol.Vb22,
      revocationCheck: MEM_CHECK_STR,
      revocationId: accumMember,
    };
    const [presentationInstance, presentationOptions] = await getPresentationInstance(credentialStatus);

    presentationInstance.presBuilder.addAccumInfoForCredStatus(0, posAccumWitness, AccumulatorModule.accumulatedFromHex(queriedAccum.accumulated), accumPk);

    // Derive a W3C Verifiable Credential JSON from the above presentation
    const credentials = await presentationInstance.deriveCredentials(
      presentationOptions,
    );

    expect(credentials.length).toEqual(1);
    expect(credentials[0].issuer).toEqual(did1);
    expect(credentials[0].credentialStatus).toBeDefined();
    expect(credentials[0].credentialStatus).toEqual({
      ...credentialStatus,
      revocationId: undefined, // Because revocation id is never revealed
      accumulated: b58.encode(AccumulatorModule.accumulatedFromHex(queriedAccum.accumulated)),
      extra: {},
    });

    const accumulatorPublicKeys = new Map();
    accumulatorPublicKeys.set(0, accumPk);

    // Create a VP and verify it from this credential
    await createAndVerifyPresentation(credentials, {
      resolver,
      accumulatorPublicKeys,
    });
  });

  test(`For ${Name}, persist credential status using VB positive accumulator with keyed-verification when deriving`, async () => {
    // No public key exists
    const queriedAccum = await dock.accumulatorModule.getAccumulator(posKvAccumulatorId, false, false);

    const credentialStatus = {
      id: `dock:accumulator:${posKvAccumulatorId}`,
      type: RevocationStatusProtocol.Vb22,
      revocationCheck: MEM_CHECK_KV_STR,
      revocationId: accumMember,
    };
    const [presentationInstance, presentationOptions] = await getPresentationInstance(credentialStatus);

    presentationInstance.presBuilder.addAccumInfoForCredStatus(0, posKvAccumWitness, AccumulatorModule.accumulatedFromHex(queriedAccum.accumulated));

    // Derive a W3C Verifiable Credential JSON from the above presentation
    const credentials = await presentationInstance.deriveCredentials(
      presentationOptions,
    );

    expect(credentials.length).toEqual(1);
    expect(credentials[0].issuer).toEqual(did1);
    expect(credentials[0].credentialStatus).toBeDefined();
    expect(credentials[0].credentialStatus).toEqual({
      ...credentialStatus,
      revocationId: undefined, // Because revocation id is never revealed
      accumulated: b58.encode(AccumulatorModule.accumulatedFromHex(queriedAccum.accumulated)),
      extra: {},
    });

    // Create a VP and verify it from this credential
    await createAndVerifyPresentation(credentials, {
      resolver,
    }, posKvAccumSecretKey);
  });

  test(`For ${Name}, persist credential status using KB universal accumulator when deriving`, async () => {
    const queriedAccum = await dock.accumulatorModule.getAccumulator(uniAccumulatorId, false, true);
    const verifAccumulator = KBUniversalAccumulator.fromAccumulated(AccumulatorModule.accumulatedFromHex(queriedAccum.accumulated, AccumulatorType.KBUni));

    const accumPk = new AccumulatorPublicKey(hexToU8a(queriedAccum.publicKey.bytes));
    expect(verifAccumulator.verifyMembershipWitness(encodedMember, uniAccumWitness, accumPk, dockAccumulatorParams())).toEqual(true);

    const credentialStatus = {
      id: `dock:accumulator:${uniAccumulatorId}`,
      type: RevocationStatusProtocol.KbUni24,
      revocationCheck: MEM_CHECK_STR,
      revocationId: accumMember,
    };
    const [presentationInstance, presentationOptions] = await getPresentationInstance(credentialStatus);

    presentationInstance.presBuilder.addAccumInfoForCredStatus(0, uniAccumWitness, AccumulatorModule.accumulatedFromHex(queriedAccum.accumulated, AccumulatorType.KBUni));

    // Derive a W3C Verifiable Credential JSON from the above presentation
    const credentials = await presentationInstance.deriveCredentials(
      presentationOptions,
    );

    const accAsU8 = AccumulatorModule.accumulatedFromHex(queriedAccum.accumulated, AccumulatorType.KBUni);
    expect(credentials.length).toEqual(1);
    expect(credentials[0].issuer).toEqual(did1);
    expect(credentials[0].credentialStatus).toBeDefined();
    expect(credentials[0].credentialStatus).toEqual({
      ...credentialStatus,
      revocationId: undefined, // Because revocation id is never revealed
      accumulated: `${b58.encode(accAsU8.toBytes())}`,
      extra: {},
    });

    const accumulatorPublicKeys = new Map();
    accumulatorPublicKeys.set(0, accumPk);

    // Create a VP and verify it from this credential
    await createAndVerifyPresentation(credentials, {
      resolver,
      accumulatorPublicKeys,
    });
  });

  test(`For ${Name}, persist credential status using KB universal accumulator with keyed-verification when deriving`, async () => {
    // No public key exists
    const queriedAccum = await dock.accumulatorModule.getAccumulator(uniKvAccumulatorId, false, false);

    const credentialStatus = {
      id: `dock:accumulator:${uniKvAccumulatorId}`,
      type: RevocationStatusProtocol.KbUni24,
      revocationCheck: MEM_CHECK_KV_STR,
      revocationId: accumMember,
    };
    const [presentationInstance, presentationOptions] = await getPresentationInstance(credentialStatus);

    presentationInstance.presBuilder.addAccumInfoForCredStatus(0, uniKvAccumWitness, AccumulatorModule.accumulatedFromHex(queriedAccum.accumulated, AccumulatorType.KBUni));

    // Derive a W3C Verifiable Credential JSON from the above presentation
    const credentials = await presentationInstance.deriveCredentials(
      presentationOptions,
    );

    const accAsU8 = AccumulatorModule.accumulatedFromHex(queriedAccum.accumulated, AccumulatorType.KBUni);
    expect(credentials.length).toEqual(1);
    expect(credentials[0].issuer).toEqual(did1);
    expect(credentials[0].credentialStatus).toBeDefined();
    expect(credentials[0].credentialStatus).toEqual({
      ...credentialStatus,
      revocationId: undefined, // Because revocation id is never revealed
      accumulated: `${b58.encode(accAsU8.toBytes())}`,
      extra: {},
    });

    // Create a VP and verify it from this credential
    await createAndVerifyPresentation(credentials, {
      resolver,
    }, uniKvAccumSecretKey);
  });

  test('Holder creates a derived verifiable credential from a credential with range proofs', async () => {
    const provingKeyId = 'provingKeyId';
    const pk = BoundCheckSnarkSetup();
    const provingKey = pk.decompress();

    const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
    const unsignedCred = {
      ...credentialJSON,
      issuer: did1,
    };

    const presentationOptions = {
      nonce: stringToU8a('noncetest'),
      context: 'my context',
    };

    // Create W3C credential
    const credential = await issueCredential(issuerKey, unsignedCred);

    // Begin to derive a credential from the above issued one
    const presentationInstance = new Presentation();
    const idx = await presentationInstance.addCredentialToPresent(
      credential,
      { resolver },
    );

    // NOTE: revealing subject type because of JSON-LD processing for this certain credential
    // you may not always need to do this depending on your JSON-LD contexts
    await presentationInstance.addAttributeToReveal(idx, [
      'credentialSubject.type.0',
    ]);
    await presentationInstance.addAttributeToReveal(idx, [
      'credentialSubject.type.1',
    ]);

    // Enforce LPR number to be between values as well as revealed
    // NOTE: unlike other tests, we cannot "reveal" this value and enforce bounds at the same time!
    presentationInstance.presBuilder.enforceBounds(
      idx,
      'credentialSubject.lprNumber',
      1233,
      1235,
      provingKeyId,
      provingKey,
    );

    // Enforce issuance date to be between values
    // NOTE: we dont need to set proving key value here (must still set ID though!) as its done above, should pass undefined
    presentationInstance.presBuilder.enforceBounds(
      idx,
      'issuanceDate',
      new Date('2019-10-01'),
      new Date('2020-01-01'),
      provingKeyId,
      undefined,
    );

    // Derive a W3C Verifiable Credential JSON from the above presentation
    const credentials = await presentationInstance.deriveCredentials(
      presentationOptions,
    );
    expect(credentials.length).toEqual(1);
    expect(credentials[0].proof).toBeDefined();
    expect(credentials[0].issuer).toEqual(credential.issuer);
    expect(credentials[0].proof.bounds).toBeDefined();
    expect(credentials[0].proof.bounds).toEqual({
      issuanceDate: [{
        min: 1569888000000,
        max: 1577836800000,
        paramId: 'provingKeyId',
        protocol: 'LegoGroth16',
      }],
      credentialSubject: {
        lprNumber: [{
          min: 1233,
          max: 1235,
          paramId: 'provingKeyId',
          protocol: 'LegoGroth16',
        }],
      },
    });
    expect(credentials[0]).toHaveProperty('credentialSubject');
    expect(credentials[0].credentialSubject).toMatchObject(
      expect.objectContaining({
        type: unsignedCred.credentialSubject.type,
      }),
    );

    const reconstructedPres = derivedToAnoncredsPresentation(credentials[0]);
    expect(reconstructedPres.proof).toBeDefined();
    expect(reconstructedPres.spec.credentials[0].bounds).toEqual(credentials[0].proof.bounds);

    // Setup predicate params with the verifying key for range proofs
    const predicateParams = new Map();
    predicateParams.set(provingKeyId, pk.getVerifyingKey());

    // Try to verify the derived credential alone
    const credentialResult = await verifyCredential(credentials[0], {
      resolver,
      predicateParams,
    });
    if (credentialResult.error) {
      console.log('credentialResult.error', JSON.stringify(credentialResult.error, null, 2));
    }
    expect(credentialResult.error).toBe(undefined);
    expect(credentialResult.verified).toBe(true);

    // Create a VP and verify it from this credential
    await createAndVerifyPresentation(credentials, { predicateParams });
  }, 60000);

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);
});
