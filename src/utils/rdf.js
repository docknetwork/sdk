import { Parser } from 'n3';

const rdfTermTypeMap = {
  BlankNode: 'Blank',
  NamedNode: 'Iri',
  Literal: 'Literal',
  DefaultGraph: 'DefaultGraph',
};

export function formatRDFTerm(type, rdf) {
  const rdfName = rdfTermTypeMap[type];
  if (!rdfName) {
    throw new Error(`Unexpected RDF term type: ${type}`);
  }

  const formattedRDF = {};
  if (rdfName === 'Literal') {
    const { value, datatype } = rdf.toJSON();
    formattedRDF[rdfName] = {
      value,
      datatype: datatype.value,
    };
  } else {
    formattedRDF[rdfName] = rdf.value;
  }
  return formattedRDF;
}

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
    const formattedSubject = formatRDFTerm(subject.termType, subject);
    const formattedPredicate = formatRDFTerm(predicate.termType, predicate);
    const formattedObject = formatRDFTerm(object.termType, object);

    // Format result as triple
    const result = [
      formattedSubject,
      formattedPredicate,
      formattedObject,
    ];

    // Add graph to complete quad type
    if (useQuads) {
      // TODO: formatted graph if should be quad
      const formattedGraph = formatRDFTerm(graph.termType, graph);
      result.push(formattedGraph);
    }

    return result;
  });
}
