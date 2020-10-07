# Claim Deduction

The [verifiable credentials data model](https://www.w3.org/TR/vc-data-model/) is based on a machine comprehensible language called [RDF](https://www.w3.org/TR/rdf-primer/). RDF represents arbitrary semantic knowledge as [graph](https://en.wikipedia.org/wiki/Graph_(discrete_mathematics))s. Computers can perform automatic deductive reasoning over RDF, given assumptions (represented as an RDF graph) and axioms (represented as logical rules), a computer can infer new conclusions and even prove them to other computers using deductive derivations (proofs).

So what does that have to do with verifiable credentials? Every VCDM credential is an RDF claim graph. Computers can reason about them, deriving new conclusions that weren't explicitly stated by the issuer.

The dock javascript SDK exposes utilities for primitive deductive reasoning over verified credentials. The Verifier has a choice to perform deduction themself (expensive), or offload that responsibility to the Presenter of the credential[s] by accepting deductive proofs of composite claims.

In RDF, if graph A is true and graph B is true, then the [union](https://en.wikipedia.org/wiki/Union_(set_theory)) of those graphs, is also true `A∧B->A∪B` [^1]. Using this property we can combine multiple credentials and reason over their union.

## Explicit Ethos using [RDF Reification](https://en.wikipedia.org/wiki/Modes_of_persuasion#Ethos)

Imagine a signed credential issued by **Alice** claiming that **Joe** is a **Member**.

```json
{
  ...
  "issuer": "Alice",
  "credentialSubject": {
    "id": "Joe",
    "@type": "Member"
  },
  ...
}
```

The credential does not directly prove that **Joe** is a **Member**. Rather, it proves **Alice** **Claims** **Joe** to be a **Member**.

Not proven:[^2]

```turtle
<Joe> a <Member> .
```

Proven:

```turtle
<Alice> <Claims> [
  rdf:subject <Joe> ;
  rdf:predicate a ;
  def:object <Member> ] .
```

Writing RDF triples about other RDF triples is called [reification](https://www.w3.org/wiki/RdfReification). Signed credentials are [ethos](https://en.wikipedia.org/wiki/Modes_of_persuasion#Ethos) arguments so we call this reified representation of credentials "Explicit Ethos" form. If a credential is *verified*, then it's explicit ethos form is *true*.

## Rule Format

To perform reasoning and to accept proofs, the Verifier must select the list of logical rules which they will allow. Rules (or axioms if you prefer), are modeled as if-then relationships.

```js
const rules = [
  {
    if_all: [],
    then: [],
  },
];
```

During reasoning, when an `if_all` pattern is matched, its corresponding `then` pattern will be implied. In logic terms, each "rule" is the conditional premise of a [modus ponens](https://en.wikipedia.org/wiki/Modus_ponens).

```js
{ if_all: [A, B, C], then: [C, D, E] }
```

means `if (A and B and C) then (C and D and E)`.

Rules can contain Bound or Unbound entities. Unbound entities are named variables. Each rule has it's own unique scope, so Unbound entities introduced in the `if_all` pattern can be used in the `then` pattern.

```js
{
  if_all: [
    [{ Bound: alice }, { Bound: likes }, { Unbound: 'thing' }],
  ],
  then: [
    [{ Bound: bob }, { Bound: likes }, { Unbound: 'thing' }]
  ],
}
```

means

```
For any ?thing:
  if [alice likes ?thing]
  then [bob likes ?thing]
```

in other words: `∀ thing: [alice likes thing] -> [bob likes thing]`

Bound entities are constants of type RdfNode. RDF nodes may be one of three things, an IRI, a blank node, or a literal. For those familiar with algebraic datatypes:

```rust,ignore
enum RdfNode {
  Iri(Url),
  Blank(String),
  Literal {
    value: String,
    datatype: Url,
  },
}
```

The SDK represents RDF nodes like so:

```js
const alice = { Iri: 'did:sample:alice' };
const literal = {
  Literal: {
    value: '{}',
    datatype: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#JSON',
  }
};
// blank nodes are generally not useful in rule definitions
const blank = { Blank: '_:b0' };
```

Example of a complete rule definition:

```js
{
  if_all: [
    [
      { Unbound: 'food' },
      { Bound { Iri: 'https://example.com/contains' } },
      { Bound: { Iri: 'https://example.com/butter' } }
    ],
    [
      { Unbound: 'person' },
      { Bound: 'http://xmlns.com/foaf/0.1/name' },
      { Literal: {
        value: 'Bob',
        datatype: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral',
      } }
    ],
  ],
  then: [
    [
      { Unbound: 'person' },
      { Bound: { Iri: 'https://example.com/likes' } },
      { Unbound: 'food' },
    ]
  ],
}
// all things named "Bob" like all things containing butter
```

See the [claim deduction tutorial](tutorial_claim_deduction.html) for more another example.

## Terms

- [Verifier](https://www.w3.org/TR/vc-data-model/#dfn-verifier): The party that accepts and checks VCDM credential[s].
- [Issuer](https://www.w3.org/TR/vc-data-model/#dfn-issuer): The party that signed a VCDM credential.
- [VCDM](https://www.w3.org/TR/vc-data-model/): Verifiable Credentials Data Model
- [RDF](https://en.wikipedia.org/wiki/Resource_Description_Framework): A model for representing general knowledge in a machine friendly way.
- RDF triple: A single sentence consisting of subject, predicate and object. Each element of the triple is an RDF node.
- [RDF graph](https://www.w3.org/TR/rdf-primer/#rdfmodel): A directed, labeled [graph](https://en.wikipedia.org/wiki/Graph_(discrete_mathematics)) with RDF triples as edges.
- [RDF node](https://www.w3.org/TR/rdf-primer/#rdfmodel)
- Composite Claim: An rdf triple which was infered, rather than stated explicitly in a credential.
- Explicit [Ethos](https://en.wikipedia.org/wiki/Modes_of_persuasion#Ethos) statement: A statement of the form "A claims X." where X is also a statement. Explicit Ethos is encodable in natural human languages as well as in RDF.

[^1]: If you ever decide to implement your own algorithm to merge RDF graphs, remember that [blank nodes](https://www.w3.org/TR/rdf11-concepts/#section-blank-nodes) exists and may need to be renamed depending on the type of graph representation in use.

[^2]: This syntax is an RDF representation called [turtle](https://www.w3.org/TR/turtle/). In turtle, "a" is shorthand for \<http://www.w3.org/1999/02/22-rdf-syntax-ns#type\> which means "is member of set".
