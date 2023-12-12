export const FORMATS = new Set(["CID", "URL", "Custom"]);

/**
 * An off-chain DID Doc reference stored on chain. The reference may be
 *  - a CID, https://docs.ipfs.io/concepts/content-addressing/#identifier-formats
 *  - a URL
 *  - any other format
 */
export default class OffChainDidDocRef {
  constructor(type, bytes) {
    if (!FORMATS.has(type)) {
      throw new Error(`Unsupported type: ${type}`);
    }

    this[type] = bytes;
  }

  static cid(bytes) {
    return new this("CID", bytes);
  }

  static url(bytes) {
    return new this("URL", bytes);
  }

  static custom(bytes) {
    return new this("Custom", bytes);
  }
}
