import { canon } from '../../src/utils/canonicalize';
import deepEqual from 'deep-equal';

describe('Canonicalization.', () => {
  test('canon: ∀ A, B ∈ Node: canon(A) = canon(B) <-> A = B', async () => {
    const samples = [
      { Iri: 'did:example:ebfeb1f712ebc6f1c276e12ec21' },
      { Iri: 'http://schema.org/alumniOf' },
      {
        Literal: {
          value: 'Example University',
          datatype: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML'
        }
      },
      {
        Literal: { // the keys in this are swapped but the canonical representation shouldn't change
          datatype: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML',
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
});
