import { documentLoader as defaultDocumentLoader } from '@docknetwork/credential-sdk/vc';

const loadDocumentDefault = defaultDocumentLoader();

export default async function documentLoader(id) {
  let document;
  if (!document) {
    document = await loadDocumentDefault(id);
  }
  return document;
}
