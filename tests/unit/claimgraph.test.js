import jsonld from 'jsonld';
import { fromJsonldjsCg, asEE, merge } from '../../src/utils/claimgraph';

describe('Claimgraph operations.', () => {
  test('merge', async () => {
    const cg1 = [
      [
        { Iri: 'https://example.com/credentials/1872' },
        {
          Literal: {
            value: 'Example University',
            datatype: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML',
          },
        },
        { Blank: '_:b1' },
        { DefaultGraph: true },
      ],
      [
        { Blank: '_:b1' },
        { Blank: '_:b3' },
        { Blank: '_:b5' },
        { Blank: '_:b6' },
      ],
    ];
    const cg2 = [
      [
        { Blank: '_:b1' },
        { Blank: '_:b4' },
        { Blank: '_:b5' },
        { Blank: '_:b6' },
      ],
    ];
    expect(merge([])).toEqual([]);
    expect(merge([cg1])).toEqual([
      [
        { Iri: 'https://example.com/credentials/1872' },
        {
          Literal: {
            value: 'Example University',
            datatype: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML',
          },
        },
        { Blank: '_:b0' },
        { DefaultGraph: true },
      ],
      [
        { Blank: '_:b0' },
        { Blank: '_:b1' },
        { Blank: '_:b2' },
        { Blank: '_:b3' },
      ],
    ]);
    expect(merge([cg2])).toEqual([
      [
        { Blank: '_:b0' },
        { Blank: '_:b1' },
        { Blank: '_:b2' },
        { Blank: '_:b3' },
      ],
    ]);
    expect(merge([cg2, cg2])).toEqual([
      [
        { Blank: '_:b0' },
        { Blank: '_:b1' },
        { Blank: '_:b2' },
        { Blank: '_:b3' },
      ],
      [
        { Blank: '_:b4' },
        { Blank: '_:b5' },
        { Blank: '_:b6' },
        { Blank: '_:b7' },
      ],
    ]);
    expect(merge([cg1, cg2])).toEqual([
      [
        { Iri: 'https://example.com/credentials/1872' },
        {
          Literal: {
            value: 'Example University',
            datatype: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML',
          },
        },
        { Blank: '_:b0' },
        { DefaultGraph: true },
      ],
      [
        { Blank: '_:b0' },
        { Blank: '_:b1' },
        { Blank: '_:b2' },
        { Blank: '_:b3' },
      ],
      [
        { Blank: '_:b4' },
        { Blank: '_:b5' },
        { Blank: '_:b6' },
        { Blank: '_:b7' },
      ],
    ]);
  });

  test('convert claimgraph from jsonld-js represention', async () => {
    const jcg = [
      {
        subject: { termType: 'NamedNode', value: 'did:example:ebfeb1f712ebc6f1c276e12ec21' },
        predicate: { termType: 'NamedNode', value: 'http://schema.org/alumniOf' },
        object: {
          termType: 'Literal',
          value: 'Example University',
          datatype: {
            termType: 'NamedNode',
            value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML',
          },
        },
        graph: { termType: 'BlankNode', value: '_:b0' },
      },
      {
        subject: { termType: 'NamedNode', value: 'https://example.com/credentials/1872' },
        predicate: { termType: 'NamedNode', value: 'https://w3id.org/security#proof' },
        object: { termType: 'BlankNode', value: '_:b1' },
        graph: { termType: 'BlankNode', value: '_:b0' },
      },
    ];
    expect(fromJsonldjsCg(jcg)).toEqual([
      [
        { Iri: 'did:example:ebfeb1f712ebc6f1c276e12ec21' },
        { Iri: 'http://schema.org/alumniOf' },
        {
          Literal: {
            value: 'Example University',
            datatype: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML',
          },
        },
        { Blank: '_:b0' },
      ], [
        { Iri: 'https://example.com/credentials/1872' },
        { Iri: 'https://w3id.org/security#proof' },
        { Blank: '_:b1' },
        { Blank: '_:b0' },
      ],
    ]);
  });

  // The claim graphs of credentials are combined in a safe manner; blank nodes from one credential
  // must not be conflated with those from another. Depending on the claim graph representation,
  // this may require renaming of blank nodes, or rejection of credential sets where blank node
  // names are shared between credentials.
  test('no blank_node conflations', () => {
    const cg1 = [
      [
        { Iri: 'https://example.com/a' },
        { Iri: 'https://example.com/parent' },
        { Blank: '_:b0' },
        { DefaultGraph: true },
      ],
    ];
    const cg2 = [
      [
        { Blank: '_:b0' },
        { Iri: 'https://example.com/parent' },
        { Iri: 'https://example.com/b' },
        { DefaultGraph: true },
      ],
    ];
    const merged = merge([cg1, cg2]);

    // It should not be provable that [a grandparent b] because `_:b0` in
    // cg1 is not the same as `_:b0` in cg2. Given this result, this property
    // is apparent.
    expect(merged).toEqual(
      [
        [
          { Iri: 'https://example.com/a' },
          { Iri: 'https://example.com/parent' },
          { Blank: '_:b0' },
          { DefaultGraph: true },
        ],
        [
          { Blank: '_:b1' },
          { Iri: 'https://example.com/parent' },
          { Iri: 'https://example.com/b' },
          { DefaultGraph: true },
        ],
      ],
    );
  });

  test('moron != carrot. https://github.com/docknetwork/sdk/issues/173', async () => {
    const jld = {
      'https://example.com/a': [{
        '@value': 'moron',
        '@language': 'en',
      }, {
        '@value': 'moron',
        '@language': 'cy',
      }],
    };
    const cg = fromJsonldjsCg(await jsonld.toRDF(jld));
    expect(cg[0]).not.toEqual(cg[1]);
    expect(cg).toEqual([
      [
        { Blank: '_:b0' },
        { Iri: 'https://example.com/a' },
        {
          Literal: {
            value: 'moron',
            datatype: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString',
            language: 'en',
          },
        },
        { DefaultGraph: true },
      ],
      [
        { Blank: '_:b0' },
        { Iri: 'https://example.com/a' },
        {
          Literal: {
            value: 'moron',
            datatype: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString',
            language: 'cy',
          },
        },
        { DefaultGraph: true },
      ],
    ]);
  });
});
