# Verifiable Credentials and Verifiable Presentations: issuing, signing and verification

## TODO:
- add section about keyDoc creation
- add section about DID integration
- The intro was 99% taken from the VCDM spec. Do we need more than this ?
- which folder should these docs go into? `docs` is being gitignored so the built ones don't get added by mistake.

## Table of contents
- [Incremental creation and verification of VC](#incremental-creation-and-verification-of-verifiable-credentials)
    - [Building a Verifiable Credential](#building-a-verifiable-credential)
      - [Adding a Context](#adding-a-context)
      - [Adding a Type](#adding-a-type)
      - [Adding a Subject](#adding-a-subject)
      - [Setting a Status](#setting-a-status)
      - [Setting the Issuance Date](#setting-the-issuance-date)
      - [Setting an Expiration Date](#setting-an-expiration-date)
    - [Signing a Verifiable Credential](#signing-a-verifiable-credential)
    - [Verifying a Verifiable Credential](#verifying-a-verifiable-credential)
- [Incremental creation and verification of VP](#incremental-creation-and-verification-of-verifiable-presentations)
    - [Building a Verifiable Presentation](#building-a-verifiable-presentation)
        - [Adding a Context](#adding-a-context)
        - [Adding a Type](#adding-a-type)
        - [Setting a Holder](#setting-a-holder)
        - [Adding a Verifiable Credential](#adding-a-verifiable-credential)
    - [Signing a Verifiable Presentation](#signing-a-verifiable-presentation)
    - [Verifying a Verifiable Presentation](#verifying-a-verifiable-presentation)

--------

## Incremental creation and verification of Verifiable Credentials
The `client-sdk` exposes a `VerifiableCredential` class that is useful to incrementally create valid Verifiable Credentials of any type, sign them and verify them.
Once the credential is initialized, you can sequentially call the different methods provided by the class to add contexts, types, issuance dates and everything else.

### Building a Verifiable Credential
The first step to build a Verifiable Credential is to initialize it, we can do that using the `VerifiableCredential` class constructor which takes a `credentialId` as sole argument:
```javascript
let vc = new VerifiableCredential('http://example.edu/credentials/2803');
```
You now have an unsigned Verifiable Credential in the `vc` variable!
This Credential isn't signed since we only just initialized it. It brings however some useful defaults to make your life easier.
```javascript
>    vc.context
<-   ["https://www.w3.org/2018/credentials/v1"]
>    vc.issuanceDate
<-   "2020-04-14T14:48:48.486Z"
>    vc.type
<-   ["VerifiableCredential"]
>    vc.subject
<-   []
```
The default `context` is an array with `"https://www.w3.org/2018/credentials/v1"` as first element. This is required by the VCDMv1 specs so having it as default helps ensure your Verifiable Credentials will be valid in the end.
A similar approach was taken on the `type` property, where the default is an array with `"VerifiableCredential"` already populated. This is also required by the specs.
The `subject` property is required to exist, so this is already initialized for you as well although it is empty for now.
Finally the `issuanceDate` is also set to the moment you initialized the `VerifiableCredential` object. You can change this later if desired but it helps having it in the right format from the get go.

We could also have checked those defaults more easily by checking the Verifiable Credential's JSON representation.
This can be achieved by calling the `toJSON()` method on it:
```javascript
>    vc.toJSON()
<-   {
       "@context": [ "https://www.w3.org/2018/credentials/v1" ],
       "credentialSubject": [],
       "id": "http://example.edu/credentials/2803",
       "type": [
         "VerifiableCredential"
       ],
       "issuanceDate": "2020-04-14T14:48:48.486Z"
     }
```
An interesting thing to note here is the transformation happening to some of the root level keys in the JSON representation of a `VerifiableCredential` object. For example `context` gets transformed into `@context` and `subject` into `credentialSubject`. This is to ensure compliance with the Verifiable Credential Data Model specs while at the same time providing you with a clean interface to the `VerifiableCredential` class in your code.

Once your Verifiable Credential has been initialized, you can proceed to use the rest of the building functions to define it completely before finally signing it.

#### Adding a Context
A context can be added with the `addContext` method. It accepts a single argument `context` which can either be a string (in which case it needs to be a valid URI), or an object (in which case it needs to be a valid context object with a `@context` field):
```javascript
>   vc.addContext('https://www.w3.org/2018/credentials/examples/v1')
>   vc.context
<-  [
      'https://www.w3.org/2018/credentials/v1',
      'https://www.w3.org/2018/credentials/examples/v1'
    ])
```

#### Adding a Type
A type can be added with the `addType` function. It accepts a single argument `type` that needs to be a string:
```javascript
>   vc.addType('AlumniCredential')
>   vc.type
<-  [
      'VerifiableCredential',
      'AlumniCredential'
    ]
```

#### Adding a Subject
A subject can be added with the `addSubject` function. It accepts a single argument `subject` that needs to be an object with an `id` property:
```javascript
>   vc.addSubject({ id: 'did:dock:123qwe123qwe123qwe', alumniOf: 'Example University' })
>   vc.subject
<-  {id: 'did:dock:123qwe123qwe123qwe', alumniOf: 'Example University'}
```

#### Setting a Status
A status can be set with the `setStatus` function. It accepts a single argument `status` that needs to be an object with an `id` property:
```javascript
>   vc.setStatus({ id: "https://example.edu/status/24", type: "CredentialStatusList2017" })
>   vc.status
<-  {
        "id": "https://example.edu/status/24",
        "type": "CredentialStatusList2017"
    }
```

#### Setting the Issuance Date
The issuance date is set by default to the datetime you first initialize your `VerifiableCredential` object. This means that you don't necessarily need to call this method to achieve a valid Verifiable Credential (which are required to have an issuanceDate property).
However, if you need to change this date you can use the `setIssuanceDate` method. It takes a single argument `issuanceDate` that needs to be a string with a valid ISO formatted datetime:
```javascript
>   vc.issuanceDate
<-  "2020-04-14T14:48:48.486Z"
>   vc.setIssuanceDate("2019-01-01T14:48:48.486Z")
>   vc.issuanceDate
<-  "2019-01-01T14:48:48.486Z"
```

#### Setting an Expiration Date
An expiration date is not set by default as it isn't required by the specs. If you wish to set one, you can use the `setExpirationDate` method. It takes a single argument `expirationDate` that needs to be a string with a valid ISO formatted datetime:
```javascript
>   vc.setExpirationDate("2029-01-01T14:48:48.486Z")
>   vc.expirationDate
<-  "2029-01-01T14:48:48.486Z"
```

### Signing a Verifiable Credential
Once you've crafted your Verifiable Credential it is time to sign it. This can be achieved with the `sign` method. It requires a `keyDoc` parameter (an object with the params and keys you'll use for signing) and it also accepts a boolean `compactProof` that determines whether you want to compact the JSON-LD or not:
```javascript
>   await vc.sign(keyDoc)
```
Please note that signing is an async process.
Once done, your `vc` object will have a new `proof` field:
```javascript
>   vc.proof
<-  {
        type: "EcdsaSecp256k1Signature2019",
        created: "2020-04-14T14:48:48.486Z",
        jws: "eyJhbGciOiJFUzI1NksiLCJiNjQiOmZhbHNlLCJjcml0IjpbImI2NCJdfQ..MEQCIAS8ZNVYIni3oShb0TFz4SMAybJcz3HkQPaTdz9OSszoAiA01w9ZkS4Zx5HEZk45QzxbqOr8eRlgMdhgFsFs1FnyMQ",
        proofPurpose: "assertionMethod",
        verificationMethod: "https://gist.githubusercontent.com/faustow/13f43164c571cf839044b60661173935/raw"
    }
```

### Verifying a Verifiable Credential
Once your Verifiable Credential has been signed you can proceed to verify it with the `verify` method. If you've used DIDs you need to pass a `resolver` for them. You can also use the booleans `compactProof` (to compact the JSON-LD) and `forceRevocationCheck` (to force revocation check). Please beware that setting `forceRevocationCheck` to false can allow false positives when verifying revocable credentials.
If your credential has uses the `status` field, you can pass a `revocationAPI` param that accepts an object describing the API to use for the revocation check. No params are required for the simplest cases:
```javascript
>   const result = await vc.verify()
>   result
<-  {
      verified: true,
      results: [
        {
          proof: [
            {
                '@context': 'https://w3id.org/security/v2',
                type: "EcdsaSecp256k1Signature2019",
                created: "2020-04-14T14:48:48.486Z",
                jws: "eyJhbGciOiJFUzI1NksiLCJiNjQiOmZhbHNlLCJjcml0IjpbImI2NCJdfQ..MEQCIAS8ZNVYIni3oShb0TFz4SMAybJcz3HkQPaTdz9OSszoAiA01w9ZkS4Zx5HEZk45QzxbqOr8eRlgMdhgFsFs1FnyMQ",
                proofPurpose: "assertionMethod",
                verificationMethod: "https://gist.githubusercontent.com/faustow/13f43164c571cf839044b60661173935/raw"
            }
          ],
          verified: true
        }
      ]
    }
```
Please note that the verification is an async process that returns an object when the promise resolves. A boolean value for the entire verification process can be checked at the root level `verified` property.

-------------

## Incremental creation and verification of Verifiable Presentations
The `client-sdk` exposes a `VerifiablePresentation` class that is useful to incrementally create valid Verifiable Presentations of any type, sign them and verify them.
Once the presentation is initialized, you can sequentially call the different methods provided by the class to add `contexts`, `types`, `holders` and `credentials`.

### Building a Verifiable Presentation
The first step to build a Verifiable Presentation is to initialize it, we can do that using the `VerifiablePresentation` class constructor which takes an `id` as sole argument:
```javascript
let vp = new VerifiablePresentation('http://example.edu/credentials/1986');
```
You now have an unsigned Verifiable Presentation in the `vp` variable!
This Presentation isn't signed since we only just initialized it. It brings however some useful defaults to make your life easier.
```javascript
>    vp.context
<-   ["https://www.w3.org/2018/credentials/v1"]
>    vp.type
<-   ["VerifiablePresentation"]
>    vp.credentials
<-   []
```
The default `context` is an array with `"https://www.w3.org/2018/credentials/v1"` as first element. This is required by the VCDMv1 specs so having it as default helps ensure your Verifiable Presentations will be valid in the end.
A similar approach was taken on the `type` property, where the default is an array with `"VerifiablePresentation"` already populated. This is also required by the specs.
The `credentials` property is required to exist, so this is already initialized for you as well although it is empty for now.

We could also have checked those defaults more easily by checking the Verifiable Presentation's JSON representation.
This can be achieved by calling the `toJSON()` method on it:
```javascript
>    vp.toJSON()
<-   {
       "@context": [ "https://www.w3.org/2018/credentials/v1" ],
       "id": "http://example.edu/credentials/1986",
       "type": [
         "VerifiablePresentation"
       ],
       "verifiableCredential": [],
     }
```
An interesting thing to note here is the transformation happening to some of the root level keys in the JSON representation of a `VerifiablePresentation` object. For example `context` gets transformed into `@context` and `credentials` into `verifiableCredential`. This is to ensure compliance with the Verifiable Credentials Data Model specs while at the same time providing you with a clean interface to the `VerifiablePresentation` class in your code.

Once your Verifiable Presentation has been initialized, you can proceed to use the rest of the building functions to define it completely before finally signing it.

#### Adding a Context
A context can be added with the `addContext` method. It accepts a single argument `context` which can either be a string (in which case it needs to be a valid URI), or an object (in which case it needs to be a valid context object with a `@context` field):
```javascript
>   vp.addContext('https://www.w3.org/2018/credentials/examples/v1')
>   vp.context
<-  [
      'https://www.w3.org/2018/credentials/v1',
      'https://www.w3.org/2018/credentials/examples/v1'
    ])
```

#### Adding a Type
A type can be added with the `addType` function. It accepts a single argument `type` that needs to be a string:
```javascript
>   vp.addType('CredentialManagerPresentation')
>   vp.type
<-  [
      'VerifiablePresentation',
      'CredentialManagerPresentation'
    ]
```

#### Setting a Holder
Setting a Holder is optional and it can be achieved using the `setHolder` method. It accepts a single argument `type` that needs to be a string (a URI for the entity that is generating the presentation):
```javascript
>   vp.setHolder('https://example.com/credentials/1234567890');
>   vp.holder
<-  'https://example.com/credentials/1234567890'
```

#### Adding a Verifiable Credential
Your Verifiable Presentations can contain one or more Verifiable Credentials inside.
Adding a Verifiable Credential can be achieved using the `addCredential` method. It accepts a single argument `credential` that needs to be an object (a valid, signed Verifiable Credential):
```javascript
>   vp.addCredential(vc);
>   vp.credentials
<-  [
      {...}
    ]
```
Please note that the example was truncated to enhance readability.


### Signing a Verifiable Presentation
Once you've crafted your Verifiable Presentation and added your Verifiable Credentials to it, it is time to sign it.
This can be achieved with the `sign` method. It requires a `keyDoc` parameter (an object with the params and keys you'll use for signing), and a `challenge` string for the proof. It also accepts a `domain` string for the proof, a `resolver` in case you're using DIDs and a boolean `compactProof` that determines whether you want to compact the JSON-LD or not:
```javascript
>   await vp.sign(
          keyDoc,
          'some_challenge',
          'some_domain',
        );
```
Please note that signing is an async process.
Once done, your `vp` object will have a new `proof` field:
```javascript
>   vp.proof
<-  {
      "type": "EcdsaSecp256k1Signature2019",
      "created": "2020-04-14T20:57:01Z",
      "challenge": "some_challenge",
      "domain": "some_domain",
      "jws": "eyJhbGciOiJFUzI1NksiLCJiNjQiOmZhbHNlLCJjcml0IjpbImI2NCJdfQ..MEUCIQCTTpivdcTKFDNdmzqe3l0nV6UjXgv0XvzCge--CTAV6wIgWfLqn_62U8jHkNSujrHFRmJ_ULj19b5rsNtjum09vbg",
      "proofPurpose": "authentication",
      "verificationMethod": "https://gist.githubusercontent.com/faustow/13f43164c571cf839044b60661173935/raw"
    }
```

### Verifying a Verifiable Presentation
Once your Verifiable Presentation has been signed you can proceed to verify it with the `verify` method.
If you've used DIDs you need to pass a `resolver` for them. You can also use the booleans `compactProof` (to compact the JSON-LD) and `forceRevocationCheck` (to force revocation check). Please beware that setting `forceRevocationCheck` to false can allow false positives when verifying revocable credentials.
If your credential has uses the `status` field, you can pass a `revocationAPI` param that accepts an object describing the API to use for the revocation check.
For the simplest cases you only need a `challenge` string and possibly a `domain` string:
```javascript
>   const results = await vp.verify('some_challenge', 'some_domain');
>   results
<-  {
      "presentationResult": {
        "verified": true,
        "results": [
          {
            "proof": {
              "@context": "https://w3id.org/security/v2",
              "type": "EcdsaSecp256k1Signature2019",
              "created": "2020-04-14T20:57:01Z",
              "challenge": "some_challenge",
              "domain": "some_domain",
              "jws": "eyJhbGciOiJFUzI1NksiLCJiNjQiOmZhbHNlLCJjcml0IjpbImI2NCJdfQ..MEUCIQCTTpivdcTKFDNdmzqe3l0nV6UjXgv0XvzCge--CTAV6wIgWfLqn_62U8jHkNSujrHFRmJ_ULj19b5rsNtjum09vbg",
              "proofPurpose": "authentication",
              "verificationMethod": "https://gist.githubusercontent.com/faustow/13f43164c571cf839044b60661173935/raw"
            },
            "verified": true
          }
        ]
      },
      "verified": true,
      "credentialResults": [
        {
          "verified": true,
          "results": [
            {
              "proof": {
                "@context": "https://w3id.org/security/v2",
                "type": "EcdsaSecp256k1Signature2019",
                "created": "2020-04-14T20:49:00Z",
                "jws": "eyJhbGciOiJFUzI1NksiLCJiNjQiOmZhbHNlLCJjcml0IjpbImI2NCJdfQ..MEUCIQCCCRuJbSUPePpOfkxsMJeQAqpydOFYWsA4cGiQRAR_QQIgehRZh8XE24hV0TPl5bMS6sNeKtC5rwZGfmflfY0eS-Y",
                "proofPurpose": "assertionMethod",
                "verificationMethod": "https://gist.githubusercontent.com/faustow/13f43164c571cf839044b60661173935/raw"
              },
              "verified": true
            }
          ]
        }
      ]
    }
```
Please note that the verification is an async process that returns an object when the promise resolves. This object contains separate results for the verification processes of the included Verifiable Credentials and the overall Verifiable Presentation. A boolean value for the entire verification process can be checked at the root level `verified` property.

