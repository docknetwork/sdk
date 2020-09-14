import VerifiableCredential from '../../src/verifiable-credential';
import VerifiablePresentation from '../../src/verifiable-presentation';
import Schema from '../../src/modules/schema';
import { createNewDockDID } from '../../src/utils/did';

import exampleCredential from '../example-credential';

describe('Serialization', () => {
  test('VerifiableCredential fromJSON should fail if no type is provided', () => {
    expect(() => VerifiableCredential.fromJSON({
      ...exampleCredential,
      type: undefined,
    })).toThrow();
  });

  test('VerifiableCredential fromJSON should fail if no context is provided', () => {
    expect(() => VerifiableCredential.fromJSON({
      ...exampleCredential,
      '@context': undefined,
    })).toThrow();
  });

  test('VerifiablePresentation fromJSON should fail if no type is provided', () => {
    expect(() => VerifiablePresentation.fromJSON({
      '@context': 'https://www.w3.org/2018/credentials/v1',
      type: undefined,
    })).toThrow();
  });

  test('VerifiablePresentation fromJSON should fail if no context is provided', () => {
    expect(() => VerifiablePresentation.fromJSON({
      '@context': undefined,
    })).toThrow();
  });

  test('VerifiableCredential from/to JSON serialization', () => {
    const vc = VerifiableCredential.fromJSON(exampleCredential);
    const vcJson = vc.toJSON();
    expect(vcJson).toMatchObject(exampleCredential);
  });

  test('VerifiablePresentation from/to JSON serialization', () => {
    const presentationId = 'http://example.edu/credentials/2803';
    const vp = new VerifiablePresentation(presentationId);
    vp.addContext('https://www.w3.org/2018/credentials/examples/v1');
    vp.addType('some_type');

    const vc = VerifiableCredential.fromJSON(exampleCredential);
    vp.addCredential(vc);

    const vpJson = vp.toJSON();

    const constructedVP = VerifiablePresentation.fromJSON(vpJson);
    expect(vpJson).toMatchObject(constructedVP.toJSON());
  });

  test('Schema from/to JSON serialization', async () => {
    const schema = new Schema();
    await schema.setJSONSchema({
      $schema: 'http://json-schema.org/draft-07/schema#',
      description: 'Dock Schema Example',
      type: 'object',
      properties: {
        id: {
          type: 'string',
        },
        emailAddress: {
          type: 'string',
          format: 'email',
        },
        alumniOf: {
          type: 'string',
        },
      },
      required: ['emailAddress', 'alumniOf'],
      additionalProperties: false,
    });

    // Set schema author
    const dockDID = createNewDockDID();
    schema.setAuthor(dockDID);

    const shemaJSON = schema.toJSON();
    const constructedSchema = Schema.fromJSON(shemaJSON);
    expect(shemaJSON).toMatchObject(constructedSchema.toJSON());
  });
});
