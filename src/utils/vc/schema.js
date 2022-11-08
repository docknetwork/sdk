import jsonld from 'jsonld';
import { validate } from 'jsonschema';
import Schema from '../../modules/schema';
import defaultDocumentLoader from './document-loader';

import {
  expandedSubjectProperty,
  expandedSchemaProperty,
  credentialIDField,
  credentialContextField,
} from './constants';

/**
 * The function uses `jsonschema` package to verify that the expanded `credential`'s subject `credentialSubject` has the JSON
 * schema `schema`
 * @param {object} credential - The credential to use, must be expanded JSON-LD
 * @param {object} schema - The schema to use
 * @param context
 * @returns {Promise<Boolean>} - Returns promise to a boolean or throws error
 */
export async function validateCredentialSchema(credential, schema, context, documentLoader) {
  const requiresID = schema.required && schema.required.indexOf('id') > -1;
  const credentialSubject = credential[expandedSubjectProperty] || [];
  const subjects = credentialSubject.length ? credentialSubject : [credentialSubject];
  for (let i = 0; i < subjects.length; i++) {
    const subject = { ...subjects[i] };
    if (!requiresID) {
      // The id will not be part of schema. The spec mentioned that id will be popped off from subject
      delete subject[credentialIDField];
    }

    const compacted = await jsonld.compact(subject, context, { documentLoader: documentLoader || defaultDocumentLoader() }); // eslint-disable-line
    delete compacted[credentialContextField];

    if (Object.keys(compacted).length === 0) {
      throw new Error('Compacted subject is empty, likely invalid');
    }

    validate(compacted, schema.schema || schema, {
      throwError: true,
    });
  }
  return true;
}

/**
 * Get schema and run validation on credential if it contains both a credentialSubject and credentialSchema
 * @param {object} credential - a verifiable credential JSON object
 * @param {object} schemaApi - An object representing a map. "schema type -> schema API". The API is used to get
 * a schema doc. For now, the object specifies the type as key and the value as the API, but the structure can change
 * as we support more APIs there are more details associated with each API. Only Dock is supported as of now.
 * @param {object} context - the context
 * @param {object} documentLoader - the document loader
 * @returns {Promise<void>}
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export async function getAndValidateSchemaIfPresent(credential, schemaApi, context, documentLoader) {
  const schemaList = credential[expandedSchemaProperty];
  if (schemaList) {
    const schema = schemaList[0];
    if (credential[expandedSubjectProperty] && schema) {
      let schemaObj;
      const schemaUri = schema[credentialIDField];

      if (schemaUri.startsWith('blob:dock')) {
        if (!schemaApi.dock) {
          throw new Error('Only Dock schemas are supported as of now.');
        }
        schemaObj = await Schema.get(schemaUri, schemaApi.dock);
      } else {
        const { document } = await documentLoader(schemaUri);
        schemaObj = document;
      }

      if (!schemaObj) {
        throw new Error(`Could not load schema URI: ${schemaUri}`);
      }

      try {
        await validateCredentialSchema(credential, schemaObj, context, documentLoader);
      } catch (e) {
        throw new Error(`Schema validation failed: ${e}`);
      }
    }
  }
}
