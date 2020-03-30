import axios from 'axios';
import testContext from './contexts/index';

export default async function(url) {
  const context = testContext[url];
  if(context) {
    return {
      contextUrl: null,
      documentUrl: url,
      document: context
    };
  }
  const {data: document} = await axios.get(url);
  return {
    contextUrl: null,
    document,
    documentUrl: url,
  };
}
