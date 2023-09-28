import jsonld from 'jsonld';
import { validate } from 'jsonschema';
import defaultDocumentLoader from './document-loader';
import { hexDIDToQualified } from '../did';

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
export async function validateCredentialSchema(
  credential,
  schema,
  context,
  documentLoader,
) {
  const requiresID = schema.required && schema.required.indexOf('id') > -1;
  const credentialSubject = credential[expandedSubjectProperty] || [];
  const subjects = credentialSubject.length
    ? credentialSubject
    : [credentialSubject];
  for (let i = 0; i < subjects.length; i++) {
    const subject = { ...subjects[i] };
    if (!requiresID) {
      // The id will not be part of schema. The spec mentioned that id will be popped off from subject
      delete subject[credentialIDField];
    }

    // eslint-disable-next-line
    const compacted = await jsonld.compact(subject, context, {
      documentLoader: documentLoader || defaultDocumentLoader(),
    });
    delete compacted[credentialContextField];

    if (Object.keys(compacted).length === 0) {
      throw new Error('Compacted subject is empty, likely invalid');
    }

    const schemaObj = schema.schema || schema;
    const subjectSchema = (schemaObj.properties && schemaObj.properties.credentialSubject)
      || schemaObj;

    validate(compacted, subjectSchema, {
      throwError: true,
    });
  }
  return true;
}

/**
 * Get schema and run validation on credential if it contains both a credentialSubject and credentialSchema
 * @param {object} credential - a verifiable credential JSON object
 * @param {object} context - the context
 * @param {object} documentLoader - the document loader
 * @returns {Promise<void>}
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export async function getAndValidateSchemaIfPresent(
  credential,
  context,
  documentLoader,
) {
  const schemaList = credential[expandedSchemaProperty];
  if (schemaList) {
    const schema = schemaList[0];
    if (credential[expandedSubjectProperty] && schema) {
      const schemaUri = schema[credentialIDField];
      let schemaObj;

      const { document } = await documentLoader(schemaUri);
      if (Array.isArray(document) && document.length === 2) {
        const [author, data] = document;

        if (typeof data !== 'object' || data instanceof Uint8Array) {
          throw new Error('Incorrect schema format');
        }

        schemaObj = {
          ...data,
          id: schemaUri,
          author: hexDIDToQualified(author),
        };
      } else {
        schemaObj = document;
      }

      try {
        await validateCredentialSchema(
          credential,
          schemaObj,
          context,
          documentLoader,
        );
      } catch (e) {
        throw new Error(`Schema validation failed: ${e}`);
      }
    }
  }
}
