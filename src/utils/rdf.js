import { Parser } from 'n3';

import { fromJsonldjsNode } from './claimgraph';

export function parseRDFDocument(document, parserOptions = {}) {
  const parser = new Parser(parserOptions);

  // Parse document using N3, should return a list of quads
  const parsedResult = parser.parse(document);

  // Determine if we should format as quads or triples
  const useQuads = parsedResult.map((quad) => quad.graph.termType === 'DefaultGraph' && !quad.value).indexOf(true) === -1;

  // Format document to format SDK expects
  return parsedResult.map((quad) => {
    const {
      subject,
      predicate,
      object,
      graph,
    } = quad;

    // Format subject, predicate and object terms into rify standard
    const formattedSubject = fromJsonldjsNode(subject);
    const formattedPredicate = fromJsonldjsNode(predicate);
    const formattedObject = fromJsonldjsNode(object);

    // Format result as triple
    const result = [
      formattedSubject,
      formattedPredicate,
      formattedObject,
    ];

    // Add graph to complete quad type
    if (useQuads) {
      // TODO: formatted graph if should be quad
      const formattedGraph = fromJsonldjsNode(graph);
      result.push(formattedGraph);
    }

    return result;
  });
}
