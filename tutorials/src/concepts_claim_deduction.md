# Claim Deduction

The [verifiable credentials data model](https://www.w3.org/TR/vc-data-model/) is based on a machine comprehensible language called [RDF](https://www.w3.org/TR/rdf-primer/). RDF represents arbitrary semantic knowledge as [graph](<https://en.wikipedia.org/wiki/Graph_(discrete_mathematics)>)s. Computers can perform automatic deductive reasoning over RDF; given assumptions (represented as an RDF graph) and axioms (represented as logical rules), a computer can infer new conclusions and even prove them to other computers using deductive derivations (proofs).

Every VCDM credential is representable as an RDF graph. So computers can reason about them, deriving new conclusions that weren't explicitly stated by the issuer.

The Dock SDK exposes utilities for primitive deductive reasoning over verified credentials. The Verifier has a choice to perform deduction themself (expensive), or offload that responsibility to the Presenter of the credential[s] by accepting deductive proofs of composite claims.

In RDF, if graph A is true and graph B is true, then the [union](<https://en.wikipedia.org/wiki/Union_(set_theory)>) of those graphs, is also true `A∧B->A∪B` [^1]. Using this property we can combine multiple credentials and reason over their union.

## Explicit Ethos

Imagine a signed credential issued by **Alice** claiming that **Joe** is a **Member**.

```json
{
  ...
  "issuer": "Alice",
  "credentialSubject": {
    "id": "Joe",
    "@type": "Member"
  },
  "proof": ...,
  ...
}
```

The credential does not directly prove that **Joe** is a **Member**. Rather, it proves **Alice** **Claims** **Joe** to be a **Member**.

Not proven:

```nquads
<Joe> <type> <Member> .
```

Proven:

```nquads
<Joe> <type> <Member> <Alice> .
```

The fourth and final element of the proven _quad_ is used here to indicate the source of the information, Alice. The final element of a quad is its [graph name](https://www.w3.org/TR/rdf11-concepts/#dfn-graph-name).

A signed credentials are [ethos](https://en.wikipedia.org/wiki/Modes_of_persuasion#Ethos) arguments and a credential may be converted to a list of quads (a claimgraph). We call this representation "Explicit Ethos" form. If a credential is _verified_, then its explicit ethos form is _true_.

## Rule Format

To perform reasoning and to accept proofs, the Verifier must select the list of logical rules wish to accept. Rules (or axioms if you prefer), are modeled as if-then relationships.

```js
const rules = [
  {
    if_all: [],
    then: [],
  },
];
```

During reasoning, when an `if_all` pattern is matched, its corresponding `then` pattern will be implied. In logic terms, each "rule" is the conditional premise of a [modus ponens](https://en.wikipedia.org/wiki/Modus_ponens).

`{ if_all: [A, B, C], then: [D, E] }` means that `if (A and B and C) then (D and E)`.

Rules can contain Bound or Unbound entities. Unbound entities are named variables. Each rule has it's own unique scope, so Unbound entities introduced in the `if_all` pattern can be used in the `then` pattern.

```js
{
  if_all: [
    [
      { Bound: alice },
      { Bound: likes },
      { Unbound: 'thing' },
      { Bound: defaultGraph },
    ],
  ],
  then: [
    [
      { Bound: bob },
      { Bound: likes },
      { Unbound: 'thing' },
      { Bound: defaultGraph },
    ],
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

If an unbound variable appears in the `then` pattern but does not appear in the `if_all` pattern the rule is considered invalid and will be rejected by the reasoner.

Bound entities are constants of type RdfTerm. RDF nodes may be one of four things, an IRI, a blank node, a literal, or the default graph. For those familiar with algebraic datatypes:

```rust,ignore
enum RdfNode {
  Iri(Url),
  Blank(String),
  Literal {
    value: String,
    datatype: Url,
  },
  DefaultGraph,
}
```

The SDK represents RDF nodes like so:

```js
const alice = { Iri: "did:sample:alice" };
const literal = {
  Literal: {
    value: "{}",
    datatype: "http://www.w3.org/1999/02/22-rdf-syntax-ns#JSON",
  },
};
// blank nodes are generally not useful in rule definitions
const blank = { Blank: "_:b0" };
const defaultGraph = { DefaultGraph: true };
```

Here is an example of a complete rule definition:

```js
{
  if_all: [
    [
      { Unbound: 'food' },
      { Bound { Iri: 'https://example.com/contains' } },
      { Bound: { Iri: 'https://example.com/butter' } },
      { Bound: { DefaultGraph: true } }
    ],
    [
      { Unbound: 'person' },
      { Bound: 'http://xmlns.com/foaf/0.1/name' },
      { Literal: {
        value: 'Bob',
        datatype: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral',
      } },
      { Bound: { DefaultGraph: true } }
    ],
  ],
  then: [
    [
      { Unbound: 'person' },
      { Bound: { Iri: 'https://example.com/likes' } },
      { Unbound: 'food' },,
      { Bound: { DefaultGraph: true } }
    ]
  ],
}
// all things named "Bob" like all things containing butter
```

See the [claim deduction tutorial](tutorial_claim_deduction.html) for more another example.

## Limited Expresiveness

The astute among you may notice the SDK's model for rules does not allow logical negation. This is by design. For one, it keeps the the rule description language from being turing complete so inference time is always bounded. Secondly, RDF choses the [Open World Assumption](https://en.wikipedia.org/wiki/Open-world_assumption) so absence of any particular statement in a credential/claimgraph is not meaningful within RDF semantics.

The rule language is expected to be expressive enough to implement [OWL 2 EL](https://www.w3.org/TR/owl2-profiles/#OWL_2_EL) but not [OWL 1 DL](https://www.w3.org/TR/owl-ref/).

## Terms

- [Verifier](https://www.w3.org/TR/vc-data-model/#dfn-verifier): The party that accepts and checks VCDM credential[s].
- [Issuer](https://www.w3.org/TR/vc-data-model/#dfn-issuer): The party that signed a VCDM credential.
- [VCDM](https://www.w3.org/TR/vc-data-model/): Verifiable Credentials Data Model
- [RDF](https://en.wikipedia.org/wiki/Resource_Description_Framework): A model for representing general knowledge in a machine friendly way.
- RDF triple: A single sentence consisting of subject, predicate and object. Each element of the triple is an RDF node.
- RDF quad: A single sentence consisting of subject, predicate, object, graph. Each element of the quad is an RDF term.
- [RDF graph](https://www.w3.org/TR/rdf-primer/#rdfmodel): A directed, labeled [graph](<https://en.wikipedia.org/wiki/Graph_(discrete_mathematics)>) with RDF triples as edges.
- [RDF node](https://www.w3.org/TR/rdf-primer/#rdfmodel)
- Composite Claim: An rdf triple which was infered, rather than stated explicitly in a credential.
- Explicit [Ethos](https://en.wikipedia.org/wiki/Modes_of_persuasion#Ethos) statement: A statement of the form "A claims X." where X is also a statement. Explicit Ethos is encodable in natural human languages as well as in RDF.

[^1]: If you ever decide to implement your own algorithm to merge RDF graphs, remember that [blank nodes](https://www.w3.org/TR/rdf11-concepts/#section-blank-nodes) exists and may need to be renamed depending on the type of graph representation in use.
