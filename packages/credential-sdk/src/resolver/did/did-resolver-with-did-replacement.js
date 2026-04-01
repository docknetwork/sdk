import { parseDIDUrl } from '../../utils';
import DIDResolver from './did-resolver';

/**
 * Class DIDResolverWithDIDReplacement extends DIDResolver.
 *
 * This class provides an implementation of the resolve method that replaces a specific did in a document if it does not match the didURL.
 * The replacement is done by parsing the document into JSON, finding and replacing all instances of 'doc.id' with 'did', and then converting it back to an object.
 */
export default class DIDResolverWithDIDReplacement extends DIDResolver {
  async resolve(didURL) {
    const { did } = parseDIDUrl(didURL);
    const doc = await super.resolve(did);

    if (doc.id !== did) {
      return JSON.parse(JSON.stringify(doc).split(doc.id).join(did));
    } else {
      return doc;
    }
  }
}
