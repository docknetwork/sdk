import { bytesToWrappedBytes } from '../../utils/misc';

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
