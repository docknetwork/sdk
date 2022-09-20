import { bytesToWrappedBytes } from '../../utils/misc';

/**
 * An off-chain DID Doc reference stored on chain. The reference may be
 *  - a CID, https://docs.ipfs.io/concepts/content-addressing/#identifier-formats
 *  - a URL
 *  - any other format
 */
export default class OffChainDidDocRef {
  static cid(bytes) {
    return {
      CID: bytesToWrappedBytes(bytes),
    };
  }

  static url(bytes) {
    return {
      URL: bytesToWrappedBytes(bytes),
    };
  }

  static custom(bytes) {
    return {
      Custom: bytesToWrappedBytes(bytes),
    };
  }
}
