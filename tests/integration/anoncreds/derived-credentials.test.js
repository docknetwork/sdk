import { randomAsHex } from '@polkadot/util-crypto';
import b58 from 'bs58';
import { hexToU8a, stringToU8a, u8aToHex } from '@polkadot/util';
import {
  initializeWasm,
  BoundCheckSnarkSetup,
  Accumulator,
  PositiveAccumulator,
  dockAccumulatorParams, AccumulatorPublicKey, deepClone,
  Encoder, BDDT16MacSecretKey, MEM_CHECK_STR,
} from '@docknetwork/crypto-wasm-ts';
import { InMemoryState } from '@docknetwork/crypto-wasm-ts/lib/accumulator/in-memory-persistence';
import { DockAPI } from '../../../src';
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
  Schemes,
} from '../../test-constants';
import { createNewDockDID, DidKeypair } from '../../../src/utils/did';
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
import AccumulatorModule from '../../../src/modules/accumulator';
import { getDelegatedProofsFromVerifiedPresentation } from '../../../src/utils/vc/presentations';
import { RevocationStatusProtocol } from '@docknetwork/crypto-wasm-ts/lib/anonymous-credentials/types-and-consts';

// TODO: move to fixtures
const residentCardSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://ld.dock.io/examples/resident-card-schema.json',
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
      required: [],
    },
  },
};

const embeddedSchema = {
  id: `data:application/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(residentCardSchema),
  )}`,
  type: 'JsonSchemaValidator2018',
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
  let accumKeypair;

  const holder3DID = createNewDockDID();
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

  const accumulatorId = randomAsHex(32);
  const accumState = new InMemoryState();
  let accumMember;

  async function checkQueriedAccum(accumId, accumulator) {
    const accumulated = u8aToHex(accumulator.accumulated);
    await dock.accumulatorModule.addPositiveAccumulator(accumId, accumulated, [did1, 1], did1, pair1, { didModule: dock.didModule }, false);
    const queriedAccum = await dock.accumulatorModule.getAccumulator(accumId, false);
    expect(queriedAccum.accumulated).toEqual(u8aToHex(accumulator.accumulated));
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
    did1 = createNewDockDID();
    await registerNewDIDUsingPair(dock, did1, pair1);

    keypair = CryptoKeyPair.generate({
      controller: did1, msgCount: 100,
    });

    if (Name !== 'BDDT16') {
      const pk1 = Module.prepareAddPublicKey(dock.api, u8aToHex(keypair.publicKeyBuffer));
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
    accumKeypair = Accumulator.generateKeypair(params);
    const bytes1 = u8aToHex(accumKeypair.publicKey.bytes);
    const accumPk = AccumulatorModule.prepareAddPublicKey(dock.api, bytes1);
    await dock.accumulatorModule.addPublicKey(
      accumPk,
      did1,
      pair1,
      { didModule: dock.did },
      false,
    );

    const accumulator = PositiveAccumulator.initialize(params, accumKeypair.secretKey);
    const members = [];
    for (let i = 1; i < 100; i++) {
      // Using default encoder since thats what the is used in credential by default. Ideally, the encoder specified in
      // the particular schema should be used but for that is the default one
      members.push(Encoder.defaultEncodeFunc()(i.toString()));
    }
    accumMember = '10';
    await accumulator.addBatch(members, accumKeypair.secretKey, accumState);

    await checkQueriedAccum(accumulatorId, accumulator);

  }, 30000);

  async function createAndVerifyPresentation(credentials, verifyOptions = {}) {
    const holderKey = getKeyDoc(
      holder3DID,
      new DidKeypair(dock.keyring.addFromUri(holder3KeySeed, null, 'sr25519'), 1),
      'Sr25519VerificationKey2020',
    );

    const presId = `https://example.com/pres/${randomAsHex(32)}`;
    const chal = randomAsHex(32);
    const domain = 'test domain';
    const presentation = createPresentation(credentials, presId);

    const reconstructedPres = derivedToAnoncredsPresentation(presentation.verifiableCredential[0]);
    const delegatedProofs = getDelegatedProofsFromVerifiedPresentation(reconstructedPres);
    const isKvac = Name === 'BDDT16';
    // Delegated proofs only exist for KVAC
    expect(delegatedProofs.size).toEqual(isKvac ? 1 : 0);
    if (isKvac) {
      const sk = new BDDT16MacSecretKey(keypair.privateKeyBuffer);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(delegatedProofs.get(0)?.credential?.proof.verify(sk).verified).toEqual(true);
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

    const delegatedProofs = getDelegatedProofsFromVerifiedPresentation(reconstructedPres);
    const isKvac = Name === 'BDDT16';
    // Delegated proofs only exist for KVAC
    expect(delegatedProofs.size).toEqual(isKvac ? 1 : 0);
    if (isKvac) {
      const sk = new BDDT16MacSecretKey(keypair.privateKeyBuffer);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(delegatedProofs.get(0)?.credential?.proof.verify(sk).verified).toEqual(true);
    }
    // Create a VP and verify it from this credential
    await createAndVerifyPresentation(credentials);
  }, 30000);

  test(`For ${Name}, persist credential status when deriving`, async () => {
    const encodedMember = Encoder.defaultEncodeFunc()(accumMember);
    const queriedAccum = await dock.accumulatorModule.getAccumulator(accumulatorId, false, true);
    const verifAccumulator = PositiveAccumulator.fromAccumulated(hexToU8a(queriedAccum.accumulated));

    // Witness created for member 1
    const witness = await verifAccumulator.membershipWitness(encodedMember, accumKeypair.secretKey, accumState);
    const accumPk = new AccumulatorPublicKey(hexToU8a(queriedAccum.publicKey.bytes));
    expect(verifAccumulator.verifyMembershipWitness(encodedMember, witness, accumPk, dockAccumulatorParams())).toEqual(true);

    const credentialStatus = {
      id: `dock:accumulator:${accumulatorId}`,
      type: RevocationStatusProtocol.Vb22,
      revocationCheck: MEM_CHECK_STR,
      revocationId: accumMember,
    };

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
    presentationInstance.presBuilder.addAccumInfoForCredStatus(0, witness, hexToU8a(queriedAccum.accumulated), accumPk);

    // NOTE: revealing subject type because of JSON-LD processing for this certain credential
    // you may not always need to do this depending on your JSON-LD contexts
    await presentationInstance.addAttributeToReveal(idx, [
      'credentialSubject.type.0',
    ]);
    await presentationInstance.addAttributeToReveal(idx, [
      'credentialSubject.type.1',
    ]);

    // Derive a W3C Verifiable Credential JSON from the above presentation
    const credentials = await presentationInstance.deriveCredentials(
      presentationOptions,
    );

    expect(credentials.length).toEqual(1);
    expect(credentials[0].credentialStatus).toBeDefined();
    expect(credentials[0].credentialStatus).toEqual({
      ...credentialStatus,
      revocationId: undefined, // Because revocation id is never revealed
      accumulated: b58.encode(hexToU8a(queriedAccum.accumulated)),
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
