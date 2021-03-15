import { Parser } from 'n3';
import createClient from 'ipfs-http-client';
import { fromJsonldjsNode } from './claimgraph';

const ipfsDefaultConfig = 'http://localhost:5001';

let ipfsClient;

/**
 * Writes a document to IPFS and returns its CID
 * @param {string} document - RDF document to store on IPFS
 * @param {object} connectionConfig - IPFS HTTP Client connection options
 * @returns {*}
 */
export async function writeToIPFS(document, connectionConfig = ipfsDefaultConfig) {
  if (!ipfsClient) {
    ipfsClient = createClient(connectionConfig);
  }
  const { cid } = await ipfsClient.add(document);
  return cid;
}

/**
 * Dereferences a CID from IPFS into a string, expects a running node to be connected to
 * @param {string} cid - IPFS document cid hash
 * @param {object} connectionConfig - IPFS HTTP Client connection options
 * @param {object} options - IPFS HTTP Client options passed to cat
 * @returns {*}
 */
export async function dereferenceFromIPFS(cid, connectionConfig = ipfsDefaultConfig, options = {}) {
  if (!ipfsClient) {
    ipfsClient = createClient(connectionConfig);
  }

  const result = [];
  const document = await ipfsClient.cat(cid, options);
  for await (const entry of document) {
    result.push(entry.toString());
  }

  return result.join('\n');
}

/**
 * Parses an RDF document string and formats it according to rify requirements
 * @param {string} document - RDF document in turtle or other form
 * @param {object} parserOptions - N3 Parser configuration object
 * @returns {*}
 */
export function parseRDFDocument(document, parserOptions = {}) {
  const parser = new Parser(parserOptions);

  // Parse document using N3, should return a list of quads
  const parsedResult = parser.parse(document);

  // Format document to format SDK expects which is a
  // list of triples as quads are assumed to have DefaultGraph
  return parsedResult.map((quad) => {
    const {
      subject,
      predicate,
      object,
      graph,
    } = quad;

    // Reject if graph isnt default as rify doesnt support it otherwise
    if (graph.termType !== 'DefaultGraph') {
      throw new Error(`Unexpected graph, expecting DefaultGraph: ${JSON.stringify(graph.toJSON())}`);
    }

    // Format subject, predicate and object terms into rify standard
    const formattedSubject = fromJsonldjsNode(subject);
    const formattedPredicate = fromJsonldjsNode(predicate);
    const formattedObject = fromJsonldjsNode(object);

    // Format result as RDF triple
    return [
      formattedSubject,
      formattedPredicate,
      formattedObject,
    ];
  });
}
