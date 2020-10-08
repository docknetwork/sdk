# Claim Deduction

## Specifying Axioms

A Verifier has complete and low level control over the logical rules they deem valid. Rules may vary from use-case to use-case and from verifier to verifier.

Unwrapping of Explicit Ethos statements is expected to be a common first step when writing a ruleset. This tutorial will give some examples of that.

### Rules example 1

This ruleset names a specific issuer and states that any claims they make are true.

```js
const rules = [
  {
    if_all: [
      [
        { Bound: { Iri: 'did:example:issuer' } },
        { Bound: { Iri: 'https://www.dock.io/rdf2020#claimsV1' } },
        { Unbound: 'claim' },
      ],
      [
        { Unbound: 'claim' },
        { Bound: { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#subject' } },
        { Unbound: 'subject' },
      ],
      [
        { Unbound: 'claim' },
        { Bound: { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#predicate' } },
        { Unbound: 'predicate' },
      ],
      [
        { Unbound: 'claim' },
        { Bound: { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#object' } },
        { Unbound: 'object' },
      ],
    ],
    then: [
      [ { Unbound: 'subject' }, { Unbound: 'predicate' }, { Unbound: 'object' } ],
    ],
  }
];
```

That single rule is enough for some use-cases but it's not scalable. What if we want to allow more than one issuer? Instead of copying the same rule for each issuer we trust, let's define "trustworthiness".

### Rules example 2

```js
const trustworthy = { Bound: { Iri: 'https://www.dock.io/rdf2020#Trustworthy' } };
const type = { Bound: { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' } };
const claims = { Bound: { Iri: 'https://www.dock.io/rdf2020#claimsV1' } };
const subject = { Bound: { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#subject' } };
const predicate = { Bound: { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#predicate } };
const object = { Bound: { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#object' } };

const rules = [
  {
    if_all: [
      [
        { Unbound: 'issuer' },
        type,
        trustworthy,
      ],
      [
        { Unbound: 'issuer' },
        claims,
        { Unbound: 'claim' },
      ],
      [
        { Unbound: 'claim' },
        subject,
        { Unbound: 'subject' },
      ],
      [
        { Unbound: 'claim' },
        predicate,
        { Unbound: 'predicate' },
      ],
      [
        { Unbound: 'claim' },
        object,
        { Unbound: 'object' },
      ],
    ],
    then: [
      [ { Unbound: 'subject' }, { Unbound: 'predicate' }, { Unbound: 'object' } ],
    ],
  },
  {
    if_all: [],
    then: [
      [ { Bound: { Iri: 'did:example:issuer' } }, type, trustworthy ]
    ],
  }
];
```

You may ask "So what's the difference? There is still only one issuer."

By that simple definition of "trustworthiness" any claim made by a trustworthy issuer is true. Since "did:example:issuer" is trustworthy, they can claim anything, including that some other issuer is trustworthy. Together, those two rules implement a system analagous to TLS certificate chains with "did:example:issuer" as the single root authority.

## Proving Composite Claims

As a Holder of verifiable credentials, you'll want to prove prove specific claims to a Verifier. If those claims are composite, you'll need to provide a deductive proof in your verifiable credentials presentation. This should be done after the presentation has been assembled. If the presentation is going to be signed, do it *after* including the deductive proof.

```js
import { proveCompositeClaims } from '@docknetwork/sdk/utils/cd';

// Check out the Issuance, Presentation, Verification tutorial for info on creating VCDM
// presentations.
const presentation = { ... };
```

## Verifying Composite Claims

```js
import { acceptCompositeClaims } from '../src/utils/cd';

// Check out the Issuance, Presentation, Verification tutorial for info on verifying VCDM
// presentations.
```
