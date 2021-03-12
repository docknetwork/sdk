import { Parser } from 'n3';

import { fromJsonldjsNode } from './claimgraph';

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
