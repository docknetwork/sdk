import { u8aToHex, u8aToU8a } from '@polkadot/util';
import { randomAsHex } from '@polkadot/util-crypto';

import dock, { DockAPI } from '../../src/api';

import { createNewDockDID, createKeyDetail, getHexIdentifierFromDID } from '../../src/utils/did';
import { FullNodeEndpoint, TestKeyringOpts, TestAccountURI } from '../test-constants';
import { getPublicKeyFromKeyringPair } from '../../src/utils/misc';
import { verifyCredential, verifyPresentation } from '../../src/utils/vc';
import { blobHexIdToQualified, DockBlobIdByteSize } from '../../src/modules/blob';
import Schema, { createNewSchemaID } from '../../src/modules/schema';
import VerifiableCredential from '../../src/verifiable-credential';
import exampleCredential from '../example-credential';
import exampleSchema from '../example-schema';
import VerifiablePresentation from '../../src/verifiable-presentation';
import getKeyDoc from '../../src/utils/vc/helpers';
import { UniversalResolver } from '../../src/resolver';
import DockResolver from '../../src/dock-resolver';

let account;
let pair;
let publicKey;
let dockDID;
let keyDetail;
let blobId;
let vcInvalid;
let vpInvalid;

let keyDoc;
let validCredential;

describe('Schema Blob Module Integration', () => {
  const dock = new DockAPI();
  let invalidFormatBlobId;

  // Generate first key with this seed. The key type is Sr25519
  const firstKeySeed = randomAsHex(32);

  beforeAll(async (done) => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
    pair = dock.keyring.addFromUri(firstKeySeed);
    publicKey = getPublicKeyFromKeyringPair(pair);
    dockDID = createNewDockDID();
    keyDetail = createKeyDetail(publicKey, dockDID);
    await dock.sendTransaction(dock.did.new(dockDID, keyDetail));
    blobId = randomAsHex(DockBlobIdByteSize);

    // Write invalid format blob
    invalidFormatBlobId = randomAsHex(DockBlobIdByteSize);
    await dock.sendTransaction(dock.blob.new({
      id: invalidFormatBlobId,
      blob: u8aToHex(u8aToU8a('hello world')),
      author: getHexIdentifierFromDID(dockDID),
    }, pair), false);

    // Write schema blob
    const blobStr = JSON.stringify(exampleSchema);
    await dock.sendTransaction(dock.blob.new({
      id: blobId,
      blob: u8aToU8a(blobStr),
      author: getHexIdentifierFromDID(dockDID),
    }, pair), false);

    vcInvalid = {
      ...exampleCredential,
      credentialSchema: {
        id: blobId,
        type: 'JsonSchemaValidator2018',
      },
      credentialSubject: {
        id: 'invalid',
        notEmailAddress: 'john.smith@example.com',
        notAlumniOf: 'Example Invalid',
      },
    };


    keyDoc = getKeyDoc(
      dockDID,
      dock.keyring.addFromUri(firstKeySeed, null, 'sr25519'),
      'Sr25519VerificationKey2020',
    );

    // keyDoc = getKeyDoc(
    //   dockDID,
    //   dock.keyring.addFromUri((firstKeySeed), null, 'ed25519'),
    //   'Sr25519VerificationKey2020',
    // );

    validCredential = new VerifiableCredential(exampleCredential.id);
    validCredential.addContext('https://www.w3.org/2018/credentials/examples/v1');
    const ctx1 = {
      "@context": {
        "emailAddress": "https://schema.org/email"
      },
    };
    validCredential.addContext(ctx1);
    validCredential.addType('AlumniCredential');
    validCredential.addSubject({
      id: dockDID,
      alumniOf: 'Example University',
      emailAddress: 'john@gmail.com',
    });
    validCredential.setSchema(blobHexIdToQualified(blobId), 'JsonSchemaValidator2018');
    validCredential.setIssuer(dockDID);
    await validCredential.sign(keyDoc);
    console.log(validCredential.toJSON());

    const dockResolver = new DockResolver(dock);
    const bla = await validCredential.verify(
      dockResolver,
      true,
      false,
      false,
      { dock },
    );
    console.log(bla);


    done();
  }, 90000);

  afterAll(async () => {
    await dock.disconnect();
  }, 30000);

  test('getSchema will return schema in correct format.', async () => {
    await expect(Schema.getSchema(blobId, dock)).resolves.toMatchObject({
      ...exampleSchema,
      id: blobId,
      author: getHexIdentifierFromDID(dockDID),
    });
  }, 30000);

  test('getSchema throws error when schema not in correct format.', async () => {
    await expect(Schema.getSchema(invalidFormatBlobId, dock)).rejects.toThrow(/Incorrect schema format/);
  }, 30000);

  test('getSchema throws error when no blob exists at the given id.', async () => {
    await expect(Schema.getSchema(createNewSchemaID(), dock)).rejects.toThrow(/does not exist/);
  }, 30000);

  test('Utility method verifyCredential should check if schema is incompatible with the credentialSubject.', async () => {
    await expect(
      verifyCredential(
        vcInvalid, null, false, false, undefined, { notDock: dock },
      ),
    ).rejects.toThrow('Only Dock schemas are supported as of now.');

    await expect(
      verifyCredential(
        vcInvalid, null, false, false, undefined, { dock },
      ),
    ).rejects.toThrow(/Schema validation failed/);
  }, 30000);

  test('The verify method should detect a subject with incompatible schema in credentialSchema.', async () => {
    const vc = VerifiableCredential.fromJSON(vcInvalid);
    await expect(
      vc.verify(
        null, false, false, undefined, { dock },
      ),
    ).rejects.toThrow(/Schema validation failed/);
  }, 30000);


  test('Utility method verifyPresentation should check if schema is incompatible with the credentialSubject.', async () => {
    // const cred = VerifiableCredential.fromJSON(exampleCredential);
    vpInvalid = new VerifiablePresentation('https://example.com/credentials/12345');
    vpInvalid.addCredential(
      vcInvalid,
    );
    // const keyDoc = {
    //   id: 'https://gist.githubusercontent.com/lovesh/67bdfd354cfaf4fb853df4d6713f4610/raw',
    //   controller: 'https://gist.githubusercontent.com/lovesh/312d407e3a16be0e7d5e43169e824958/raw',
    //   type: 'EcdsaSecp256k1VerificationKey2019', // TODO use different signature scheme
    //   keyPair: pair,
    //   publicKey,
    // };
    vpInvalid = await vpInvalid.sign(
      keyDoc,
      'some_challenge',
      'some_domain',
    );
    console.log(vpInvalid);

    await expect(
      verifyPresentation(
        vpInvalid.toJSON(), null, false, false, undefined, { notDock: dock },
      ),
    ).rejects.toThrow('Only Dock schemas are supported as of now.');

    await expect(
      verifyPresentation(
        vpInvalid.toJSON(), null, false, false, undefined, { dock },
      ),
    ).rejects.toThrow(/Schema validation failed/);
  }, 300000);

  test('Utility method verifyPresentation should check if schema is compatible with the credentialSubject.', async () => {
    // const cred = VerifiableCredential.fromJSON(exampleCredential);
    let presentation = new VerifiablePresentation('https://example.com/credentials/12345');
    presentation.addCredential(
      validCredential,
    );
    // const keyDoc = {
    //   id: 'https://gist.githubusercontent.com/lovesh/67bdfd354cfaf4fb853df4d6713f4610/raw',
    //   controller: 'https://gist.githubusercontent.com/lovesh/312d407e3a16be0e7d5e43169e824958/raw',
    //   type: 'EcdsaSecp256k1VerificationKey2019', // TODO use different signature scheme
    //   keyPair: pair,
    //   publicKey,
    // };
    presentation = await presentation.sign(
      keyDoc,
      'some_challenge',
      'some_domain',
    );
    console.log(presentation);

    await expect(
      verifyPresentation(
        presentation.toJSON(), 'some_challenge', 'some_domain', new DockResolver(dock), true, false, undefined, {dock: dock})
    ).resolves.toBeDefined();

    /*await expect(
      verifyPresentation(
        vpInvalid.toJSON(), 'some_challenge', false, false, undefined, { dock },
      ),
    ).rejects.toThrow(/Schema validation failed/);*/
  }, 300000);
});
