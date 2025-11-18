import credentialDocumentLoader from '../../credential-sdk/dist/esm/vc/document-loader.js';

const loadDocumentDefault = credentialDocumentLoader();

export default function documentLoader(id) {
  return loadDocumentDefault(id);
}
