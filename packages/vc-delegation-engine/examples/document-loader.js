import credentialDocumentLoader from '../../credential-sdk/src/vc/document-loader.js';

const loadDocumentDefault = credentialDocumentLoader();

export default function documentLoader(id) {
  return loadDocumentDefault(id);
}
