import { canonicalize } from "json-canonicalize";
import { validate } from "jsonschema";

// Supported schemas
import JSONSchema07 from "../../../vc/schemas/schema-draft-07";
import jsonFetch from "../../../utils/json-fetch";
import { Blob, BlobWithId } from "../../../types";

export default class Schema {
  /**
   * Creates a new `Schema` object
   * @constructor
   * @param {string} [id] - schema ID
   */
  constructor(id) {
    this.id = id;
  }

  static fromJSON(json) {
    const { id, schema } = json;

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
  sign(pair) {
    this.signature = pair.sign(this.toBlob().blob.bytes);
    return this;
  }

  /**
   * Serializes schema object to JSON
   * @returns {object}
   */
  toJSON() {
    const { signature: _signature, ...rest } = this;

    return rest;
  }

  /**
   * Serializes the schema to a blob object to send to the node
   * @returns {object}
   */
  toBlob() {
    if (!this.schema) {
      throw new Error(
        "Schema requires schema property to be serialized to blob"
      );
    }

    return new BlobWithId(this.id, new Blob(canonicalize(this.schema)));
  }

  /**
   * Prepares a transaction to write this schema object to the dock chain using the blob module
   * @param {AbstractBlobModule} blobModule - The dock API
   * @param targetDid
   * @param keyPair
   * @param params
   * @return {Promise<object>} The extrinsic to sign and send.
   */
  async writeToChain(blobModule, targetDid, keyPair, params) {
    return await blobModule.new(this.toBlob(), targetDid, keyPair, params);
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
   * @param {AbstractBlobModule} blobModule
   * @returns {Promise<object>}
   */
  static async get(id, blobModule) {
    const [author, chainBlob] = await blobModule.get(id);

    return {
      ...chainBlob.toObject(),
      id: String(id),
      author: String(author),
    };
  }

  /**
   * Gets the JSON schema spec from given JSON. Will either return the stored JSON schema or get
   * it using HTTP or will throw error if cannot get.
   * @param {object} json
   * @returns {Promise<object>}
   */
  static async getJSONSchemaSpec(json) {
    const schemaKey = "$schema";
    const schemaUrl = json[schemaKey];
    if (schemaUrl) {
      // The URL might be 'http://json-schema.org/draft-07/schema' or 'http://json-schema.org/draft-07/schema#'
      // In that case, the schema is already stored in the SDK as this is the latest JSON schema spec
      if (
        schemaUrl === "http://json-schema.org/draft-07/schema" ||
        schemaUrl === "http://json-schema.org/draft-07/schema#"
      ) {
        // Return stored JSON schema
        return JSONSchema07;
      }
      // Fetch the URI and expect a JSON response
      const doc = await jsonFetch(schemaUrl);
      if (typeof doc === "object") {
        return doc;
      }
      // If MIME type did not indicate JSON, try to parse the response as JSON
      try {
        return JSON.parse(doc);
      } catch (e) {
        throw new Error("Cannot parse response as JSON");
      }
    } else {
      throw new Error(`${schemaKey} not found in the given JSON`);
    }
  }
}
