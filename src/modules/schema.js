import { canonicalize } from 'json-canonicalize';
import { validate } from 'jsonschema';
import axios from 'axios';

import { hexDIDToQualified } from '../utils/did';
import { getSignatureFromKeyringPair } from '../utils/misc';

import {
  createNewDockBlobId,
  getHexIdentifierFromBlobID,
} from './blob';

// Supported schemas
import JSONSchema07 from '../utils/vc/schemas/schema-draft-07';

export default class Schema {
  /**
   * Creates a new `Schema` object
   * @constructor
   * @param {string} [id] - optional schema ID, if not given, generate a random id
   */
  constructor(id) {
    this.id = id || createNewDockBlobId();
  }

  static fromJSON(json) {
    const {
      id, schema,
    } = json;

    const schemaObj = new Schema(id);

    if (schema) {
      schemaObj.schema = schema;
    }

    return schemaObj;
  }

  /**
   * Add the JSON schema to this object after checking that `json` is a valid JSON schema. Check if JSON is valid.
   * @param {object} json - the schema JSON
   */
  async setJSONSchema(json) {
    await Schema.validateSchema(json);
    this.schema = json;
    return this;
  }

  /**
   * Serializes the object using `getSerializedBlob` and then signs it using the given
   * polkadot-js pair. The object will be updated with key `signature`. Repeatedly calling it will
   * keep resetting the `signature` key
   * @param {object} pair - Key pair to sign with
   * @param blobModule
   */
  sign(pair, blobModule) {
    const serializedBlob = blobModule.getSerializedBlob(this.toBlob());
    this.signature = getSignatureFromKeyringPair(pair, serializedBlob);
    return this;
  }

  /**
   * Serializes schema object to JSON
   * @returns {object}
   */
  toJSON() {
    const {
      signature,
      ...rest
    } = this;

    return {
      ...rest,
    };
  }

  /**
   * Serializes the schema to a blob object to send to the node
   * @returns {object}
   */
  toBlob() {
    if (!this.schema) {
      throw new Error('Schema requires schema property to be serialized to blob');
    }

    return {
      id: getHexIdentifierFromBlobID(this.id),
      blob: canonicalize(this.schema),
    };
  }

  /**
   * Prepares a transaction to write this schema object to the dock chain using the blob module
   * @param {object} dock - The dock API
   * @param signerDid
   * @param keyPair
   * @param keyId
   * @param nonce
   * @param waitForFinalization
   * @param params
   * @return {Promise<object>} The extrinsic to sign and send.
   */
  async writeToChain(dock, signerDid, keyPair, keyId, nonce = undefined, waitForFinalization, params = {}) {
    let arg;
    if (nonce === undefined) {
      arg = { didModule: dock.did };
    } else {
      arg = { nonce };
    }
    return dock.blob.new(this.toBlob(), signerDid, keyPair, keyId, arg, waitForFinalization, params);
  }

  /**
   * Check that the given JSON schema is compliant with JSON schema spec mentioned in RFC
   * @param {object} json - The JSON schema to validate
   * @returns {Promise<object>} - Returns promise to an object or throws error
   */
  static async validateSchema(json) {
    // Get the JSON schema spec to check against.
    const jsonSchemaSpec = await this.getJSONSchemaSpec(json);
    return validate(json, jsonSchemaSpec, {
      throwError: true,
    });
  }

  /**
   * Get schema from the chain using the given id, by querying the blob storage.
   * Accepts a full blob id like blob:dock:0x... or just the hex identifier and the `DockAPI` object.
   * The returned schema would be formatted as specified in the RFC (including author DID, schema id) or an error is
   * returned if schema is not found on the chain or in JSON format.
   * @param {string} id - The Schema ID
   * @param {object} dockApi - The Dock API
   * @returns {Promise<object>}
   */
  static async get(id, dockApi) {
    const hexId = getHexIdentifierFromBlobID(id);
    const chainBlob = await dockApi.blob.get(hexId);
    const chainValue = chainBlob[1];

    if (typeof chainValue === 'object' && !(chainValue instanceof Uint8Array)) {
      return {
        ...chainValue,
        id,
        author: hexDIDToQualified(chainBlob[0]),
      };
    }
    throw new Error('Incorrect schema format');
  }

  /**
   * Gets the JSON schema spec from given JSON. Will either return the stored JSON schema or get
   * it using HTTP or will throw error if cannot get.
   * @param {object} json
   * @returns {Promise<object>}
   */
  static async getJSONSchemaSpec(json) {
    const schemaKey = '$schema';
    const schemaUrl = json[schemaKey];
    if (schemaUrl) {
      // The URL might be 'http://json-schema.org/draft-07/schema' or 'http://json-schema.org/draft-07/schema#'
      // In that case, the schema is already stored in the SDK as this is the latest JSON schema spec
      if (schemaUrl === 'http://json-schema.org/draft-07/schema' || schemaUrl === 'http://json-schema.org/draft-07/schema#') {
        // Return stored JSON schema
        return JSONSchema07;
      }
      // Fetch the URI and expect a JSON response
      const { data: doc } = await axios.get(schemaUrl);
      if (typeof doc === 'object') {
        return doc;
      }
      // If MIME type did not indicate JSON, try to parse the response as JSON
      try {
        return JSON.parse(doc);
      } catch (e) {
        throw new Error('Cannot parse response as JSON');
      }
    } else {
      throw new Error(`${schemaKey} not found in the given JSON`);
    }
  }
}
