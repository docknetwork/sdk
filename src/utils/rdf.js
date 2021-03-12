import { Parser } from 'n3';

import { fromJsonldjsNode } from './claimgraph';

export function parseRDFDocument(document, parserOptions = {}) {
  const parser = new Parser(parserOptions);

  // Parse document using N3, should return a list of quads
  const parsedResult = parser.parse(document);

  // Format document to format SDK expects
  return parsedResult.map((quad) => {
    const {
      subject,
      predicate,
      object,
      graph,
    } = quad;

    // Reject if graph isnt default
    // as rify doesnt support it otherwise
    if (graph.termType !== 'DefaultGraph') {
      throw new Error(`Unexpected graph, expecting DefaultGraph: ${JSON.stringify(graph.toJSON())}`);
    }

    // Format subject, predicate and object terms into rify standard
    const formattedSubject = fromJsonldjsNode(subject);
    const formattedPredicate = fromJsonldjsNode(predicate);
    const formattedObject = fromJsonldjsNode(object);
    const formattedGraph = fromJsonldjsNode(graph);

    // Format result as RDF quad
    return [
      formattedSubject,
      formattedPredicate,
      formattedObject,
      formattedGraph,
    ];
  });
}
