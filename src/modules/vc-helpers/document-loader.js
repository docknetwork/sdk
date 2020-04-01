import axios from 'axios';
import testContext from './contexts/index';

export default async function(url) {
  const context = testContext[url];
  if(context) {
    return {
      documentUrl: url,
      document: context
    };
  }
  // TODO: add support for resolving DIDs, maybe something like:
  // if (url.startsWith('did:')) {
  //   const did_doc = await resolveEthrDIDAndDockDID(did);
  //   return {
  //     contextUrl: null,
  //     documentUrl: url,
  //     did_doc
  //   }
  // }
  const {data: document} = await axios.get(url);
  return {
    document,
    documentUrl: url,
  };
}
