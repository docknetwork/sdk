import { fromJsonldjsCg, asEE, canon, merge } from '../../src/utils/claimgraph';
import deepEqual from 'deep-equal';

describe('Claimgraph operations.', () => {
  test('merge', async () => {
    let cg1 = [
      [
        { Iri: 'https://example.com/credentials/1872' },
        {
          Literal: {
            value: 'Example University',
            type: { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML' }
          }
        },
        { Blank: '_:b1' }
      ],
      [
        { Blank: '_:b1' },
        { Blank: '_:b3' },
        { Blank: '_:b5' }
      ]
    ];
    let cg2 = [
      [
        { Blank: '_:b1' },
        { Blank: '_:b4' },
        { Blank: '_:b5' }
      ]
    ];
    expect(merge(cg1, cg1)).toEqual([]);
    expect(merge(cg1, cg2)).toEqual([]);
  });

  test('canon: ∀ A, B ∈ Node: canon(A) = canon(B) <-> A = B', async () => {
    const samples = [
      { Iri: 'did:example:ebfeb1f712ebc6f1c276e12ec21' },
      { Iri: 'http://schema.org/alumniOf' },
      {
        Literal: {
          value: 'Example University',
          type: { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML' }
        }
      },
      {
        Literal: { // the keys in this are swapped but the canonical representation shouldn't change
          type: { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML' },
          value: 'Example University'
        }
      },
      { Iri: 'https://example.com/credentials/1872' },
      { Iri: 'https://w3id.org/security#proof' },
      { Blank: '_:b1' },
    ];
    for (let A of samples) {
      for (let B of samples) {
        expect(deepEqual(A, B)).toEqual(canon(A) === canon(B));
      }
    }
  });

  test('asEE', async () => {
    let cg = [
      [
        { Iri: 'did:example:ebfeb1f712ebc6f1c276e12ec21' },
        { Iri: 'http://schema.org/alumniOf' },
        {
          Literal: {
            value: 'Example University',
            type: { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML' }
          }
        }
      ], [
        { Iri: 'https://example.com/credentials/1872' },
        { Iri: 'https://w3id.org/security#proof' },
        { Blank: '_:b1' }
      ]
    ];
    let eecg = asEE(cg, 'did:dock:bobert');
    expect(eecg).toEqual([
      [
        { "Iri": "did:dock:bobert" },
        { "Iri": "https://www.dock.io/rdf2020#claimsV1" },
        { "Blank": "_:b0" }
      ],
      [
        { "Blank": "_:b0" },
        { "Iri": "http://www.w3.org/1999/02/22-rdf-syntax-ns#subject" },
        { "Iri": "did:example:ebfeb1f712ebc6f1c276e12ec21" }
      ],
      [
        { "Blank": "_:b0" },
        { "Iri": "http://www.w3.org/1999/02/22-rdf-syntax-ns#predicate" },
        { "Iri": "http://schema.org/alumniOf" }
      ],
      [
        { "Blank": "_:b0" },
        { "Iri": "http://www.w3.org/1999/02/22-rdf-syntax-ns#object" },
        {
          "Literal": {
            "value": "Example University",
            "type": {
              "Iri": "http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML"
            }
          }
        }
      ],
      [
        { "Iri": "did:dock:bobert" },
        { "Iri": "https://www.dock.io/rdf2020#claimsV1" },
        { "Blank": "_:b2" }
      ],
      [
        { "Blank": "_:b2" },
        { "Iri": "http://www.w3.org/1999/02/22-rdf-syntax-ns#subject" },
        { "Iri": "https://example.com/credentials/1872" }
      ],
      [
        { "Blank": "_:b2" },
        { "Iri": "http://www.w3.org/1999/02/22-rdf-syntax-ns#predicate" },
        { "Iri": "https://w3id.org/security#proof" }
      ],
      [
        { "Blank": "_:b2" },
        { "Iri": "http://www.w3.org/1999/02/22-rdf-syntax-ns#object" },
        { "Blank": "_:b1" }
      ]
    ]);
  });

  test('convert claimgraph from jsonld-js represention', async () => {
    let jcg = [
      {
        "subject": { "termType": "NamedNode", "value": "did:example:ebfeb1f712ebc6f1c276e12ec21" },
        "predicate": { "termType": "NamedNode", "value": "http://schema.org/alumniOf" },
        "object": {
          "termType": "Literal",
          "value": "Example University",
          "datatype": {
            "termType": "NamedNode",
            "value": "http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML"
          }
        },
        "graph": { "termType": "BlankNode", "value": "_:b0" }
      },
      {
        "subject": { "termType": "NamedNode", "value": "https://example.com/credentials/1872" },
        "predicate": { "termType": "NamedNode", "value": "https://w3id.org/security#proof" },
        "object": { "termType": "BlankNode", "value": "_:b1" },
        "graph": { "termType": "BlankNode", "value": "_:b0" }
      }
    ];
    expect(fromJsonldjsCg(jcg)).toEqual([
      [
        { Iri: 'did:example:ebfeb1f712ebc6f1c276e12ec21' },
        { Iri: 'http://schema.org/alumniOf' },
        {
          Literal: {
            value: 'Example University',
            type: { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML' }
          }
        }
      ], [
        { Iri: 'https://example.com/credentials/1872' },
        { Iri: 'https://w3id.org/security#proof' },
        { Blank: '_:b1' }
      ]
    ]);
  });

  // // The claim graphs of credentials are combined in a safe manner; blank nodes from one credential
  // // must not be conflated with those from another. Depending on the claim graph representation,
  // // this may require renaming of blank nodes, or rejection of credential sets where blank node
  // // names are shared between credentials.
  // test('no blank_node conflations', () => {
  //   // Need to noodle on how/if this requirement can be tested.
  //   todo();
  // });
});
