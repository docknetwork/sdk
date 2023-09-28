import { MultiResolver } from '../generic';

/**
 * Resolves `Blob` with the identifier `blob:*`.
 * @abstract
 */
export default class BlobResolver extends MultiResolver {
  static PREFIX = 'blob';
}
