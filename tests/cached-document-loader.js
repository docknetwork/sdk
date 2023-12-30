import contexts from '../src/utils/vc/contexts';
import network_cache from './network-cache';
import jsonFetch from '../src/utils/json-fetch';

// global document cache, replaces the internet and acts as a did method
const documentRegistry = {};
for (const [k, v] of contexts) {
  addDocument(k, v);
}
for (const k of Object.keys(network_cache)) {
  addDocument(k, network_cache[k]);
}

/// document loader that pulls documents from the local documentRegistry
export async function documentLoader(url) {
  if (documentRegistry[url] === undefined) {
    if (!(url.startsWith('http://') || url.startsWith('https://'))) {
      throw new Error(`failed to resolve ${url}`);
    }
    documentRegistry[url] = await jsonFetch(url);
    console.warn(
      'Unit test is making web requests. This is slow. Please update ./test/network-cache.js',
      'with: ',
      JSON.stringify({ [url]: documentRegistry[url] }, null, 2),
    );
  }
  return {
    documentUrl: url,
    document: defensive_copy(documentRegistry[url]),
  };
}

/// add a document to the registry
export function addDocument(iri, doc) {
  documentRegistry[iri] = defensive_copy(doc);
}

export async function modifyDocument(iri, cb) {
  const original = (await documentLoader(iri)).document;
  addDocument(iri, cb(original));
}

/// check if document is already cached/registered
export function registered(iri) {
  return iri in documentRegistry;
}

function defensive_copy(x) {
  return JSON.parse(JSON.stringify(x));
}
