// @ts-nocheck
import { Parser, Store, DataFactory } from 'n3';
import assert from 'assert';
import { fromJsonldjsNode } from './claimgraph';

/**
 * Converts a a JSON-LD RDF object to N3 data type
 * @param {object} node - JSON-LD RDF representation object
 * @returns {any}
 */
export function toJsonldjsNode(node) {
  if (node.DefaultGraph) {
    return DataFactory.defaultGraph();
  } else if (node.Iri) {
    return DataFactory.namedNode(node.Iri);
  } else if (node.Blank) {
    return DataFactory.blankNode(node.Blank);
  } else if (node.Literal) {
    return DataFactory.literal(node.Literal.value, {
      value: node.Literal.datatype,
      language: node.Literal.language,
    });
  }

  throw new Error(`Unable to determine node type: ${node}`);
}

/**
 * Converts a claimgraph JSON representation into an N3 RDF store
 * @param {object} claimgraph - JSON-LD RDF object
 * @returns {Store}
 */
export function claimgraphToStore(claimgraph) {
  const store = new Store();
  claimgraph.forEach((quad) => {
    const subject = quad[0];
    const predicate = quad[1];
    const object = quad[2];
    const graph = quad.length > 3 ? toJsonldjsNode(quad[3]) : undefined;
    store.addQuad(DataFactory.quad(
      toJsonldjsNode(subject),
      toJsonldjsNode(predicate),
      toJsonldjsNode(object),
      graph,
    ));
  });
  return store;
}

/**
 * Queries a claimgraph object and returns all the bindings to the variable named `?lookupNext`
 * @param {array<object>} claimgraph - A list of RDF quads
 * @param {string} query - SPARQL query string
 * @param {object} engine - RDF query engine
 * @returns {array<any>}
 */
export async function queryNextLookup(claimgraph, query, engine) {
  if (!engine) {
    throw new Error('queryNextLookup requires an RDF query engine');
  }

  // Create an N3 store from claimgraph JSON object
  const store = claimgraphToStore(claimgraph);

  // Query the engine, if querying multiple times user should
  // pass engine parameter for optimal performance
  const result = await engine.query(query, { sources: [store] });

  // Get bindings from query
  const bindings = await result.bindings();

  // Convert bindings to claimgraph format using lookupNext variable
  bindings.forEach((b) => assert(
    b.get('?lookupNext') !== undefined,
    "Query for next lookup must always bind '?lookupNext'",
  ));
  return bindings.map((binding) => fromJsonldjsNode(binding.get('?lookupNext')));
}

/**
 * Dereferences a CID from IPFS into a string, expects a running node to be connected to
 * @param {string} cid - IPFS document cid hash
 * @param {object} ipfsClient - The IPFS HTTP Client
 * @param {object} options - IPFS HTTP Client options passed to cat
 * @returns {Promise<string>}
 */
export async function dereferenceFromIPFS(cid, ipfsClient, options = {}) {
  if (cid.indexOf('/ipns/') !== -1) {
    throw new Error(`Dereferencing of IPNS documents is disabled in this method, cid: ${cid}`);
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
