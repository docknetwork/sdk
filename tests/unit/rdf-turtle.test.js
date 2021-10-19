import { parseRDFDocument, queryNextLookup } from '../../src/utils/rdf';

const rdfInputs = [
  `
    @prefix : <http://example.org/stuff/1.0/> .
    :a :b ( "apple" "banana" ) .
  `,
  `
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
    @prefix dc: <http://purl.org/dc/elements/1.1/> .
    @prefix ex: <http://example.org/stuff/1.0/> .
    <http://www.w3.org/TR/rdf-syntax-grammar>
      dc:title "RDF/XML Syntax Specification (Revised)" ;
      ex:editor [
        ex:fullname "Dave Beckett";
        ex:homePage <http://purl.org/net/dajobe/>
      ] .
  `,
  `
    <http://one.example/subject1> <http://one.example/predicate1> <http://one.example/object1> <http://example.org/graph3> . # comments here
    # or on a line by themselves
    _:subject1 <http://an.example/predicate1> "object1" <http://example.org/graph1> .
    _:subject2 <http://an.example/predicate2> "object2" <http://example.org/graph5> .
  `,
];

const dbpediaSource = [
  [
    { Iri: 'a' },
    { Iri: 'b' },
    { Iri: 'http://dbpedia.org/resource/Belgium' },
  ],
  [
    { Iri: 'c' },
    { Iri: 'd' },
    { Iri: 'http://dbpedia.org/resource/Ghent' },
  ],
  [
    { Iri: 'c' },
    { Iri: 'd' },
    { Iri: 'http://dbpedia.org/resource/Austria' },
  ],
];

const claimgraph = [
  [
    { Iri: 'did:a' },
    { Iri: 'http://rdf.dock.io/alpha/2021#mayClaim' },
    { Iri: 'http://rdf.dock.io/alpha/2021#ANYCLAIM' },
    { DefaultGraph: true },
  ],
  [
    { Iri: 'did:b' },
    { Iri: 'http://rdf.dock.io/alpha/2021#mayClaim' },
    { Iri: 'http://rdf.dock.io/alpha/2021#ANYCLAIM' },
    { Iri: 'did:a' },
  ],
];

describe('RDF SPARQL', () => {
  test('Can query an RDF source (dbpedia)', async () => {
    const query = 'SELECT * { ?s ?p <http://dbpedia.org/resource/Belgium>. ?s ?p ?lookupNext } LIMIT 2';
    const newGraph = await queryNextLookup(dbpediaSource, query);
    expect(newGraph).toEqual([
      { Iri: 'http://dbpedia.org/resource/Belgium' },
    ]);
  });

  test('Can query a claimgraph', async () => {
    const query = `prefix dockalpha: <http://rdf.dock.io/alpha/2021#>
    select * {
      ?root dockalpha:mayClaim dockalpha:ANYCLAIM .
      graph ?root {
        ?lookupNext dockalpha:mayClaim dockalpha:ANYCLAIM .
      }
    }`;
    const queryResult = await queryNextLookup(claimgraph, query);
    expect(queryResult).toEqual([
      { Iri: 'did:b' },
    ]);
  });
});

describe('RDF Turtle Parsing', () => {
  test('Can parse and format RDF test 1', async () => {
    const result = parseRDFDocument(rdfInputs[0]);
    const expectedResult = [
      [
        { Blank: expect.anything() },
        { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#first' },
        {
          Literal: {
            value: 'apple',
            datatype: 'http://www.w3.org/2001/XMLSchema#string',
          },
        },
      ],
      [
        { Blank: expect.anything() },
        { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#rest' },
        { Blank: expect.anything() },
      ],
      [
        { Blank: expect.anything() },
        { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#first' },
        {
          Literal: {
            value: 'banana',
            datatype: 'http://www.w3.org/2001/XMLSchema#string',
          },
        },
      ],
      [
        { Blank: expect.anything() },
        { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#rest' },
        { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil' },
      ],
      [
        { Iri: 'http://example.org/stuff/1.0/a' },
        { Iri: 'http://example.org/stuff/1.0/b' },
        { Blank: expect.anything() },
      ],
    ];

    expect(result.length).toEqual(expectedResult.length);
    expect(result).toEqual(expect.arrayContaining(expectedResult));
  });

  test('Can parse and format RDF test 2', async () => {
    const result = parseRDFDocument(rdfInputs[1]);
    const expectedResult = [
      [
        { Iri: 'http://www.w3.org/TR/rdf-syntax-grammar' },
        { Iri: 'http://purl.org/dc/elements/1.1/title' },
        {
          Literal: {
            value: 'RDF/XML Syntax Specification (Revised)',
            datatype: 'http://www.w3.org/2001/XMLSchema#string',
          },
        },
      ],
      [
        { Iri: 'http://www.w3.org/TR/rdf-syntax-grammar' },
        { Iri: 'http://example.org/stuff/1.0/editor' },
        { Blank: expect.anything() },
      ],
      [
        { Blank: expect.anything() },
        { Iri: 'http://example.org/stuff/1.0/fullname' },
        {
          Literal: {
            value: 'Dave Beckett',
            datatype: 'http://www.w3.org/2001/XMLSchema#string',
          },
        },
      ],
      [
        { Blank: expect.anything() },
        { Iri: 'http://example.org/stuff/1.0/homePage' },
        { Iri: 'http://purl.org/net/dajobe/' },
      ],
    ];

    expect(result.length).toEqual(expectedResult.length);
    expect(result).toEqual(expect.arrayContaining(expectedResult));
  });

  test('Cannot parse RDF document with non-default graph', async () => {
    expect(() => {
      parseRDFDocument(rdfInputs[2]);
    }).toThrowError(/Unexpected graph/);
  });
});
