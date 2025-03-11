# Schemas

## Table of contents

1. [Intro](#intro)
1. [Blobs](#blobs)
   1. [Writing a Blob](#writing-a-blob)
   1. [Reading a Blob](#reading-a-blob)
1. [Schemas](#blobs)
   1. [Creating a Schema](#creating-a-schema)
   1. [Writing a Schema](#writing-a-schema-to-the-dock-chain)
   1. [Reading a Schema](#reading-a-schema-from-the-dock-chain)
   1. [Schemas in Verifiable Credentials](#schemas-in-verifiable-credentials)
   1. [Schemas in Verifiable Presentations](#schemas-in-verifiable-presentations)

## Intro

Data Schemas are useful way of enforcing a specific structure on a collection of data like a Verifiable Credential.
Data schemas serve a different purpose than that of the `@context` property in a Verifiable Credential, the latter
neither enforces data structure or data syntax, nor enables the definition of arbitrary encodings to alternate
representation formats.

## Blobs

Schemas are stored on chain as a `Blob` in the Blob Storage module of the Dock chain, so understanding blobs is
important before diving into Schemas.

### Writing a Blob

A new Blob can be registered on the Dock Chain by using the method `writeToChain` in the BlobModule class.
It accepts a `blob` object with the struct to store on chain (it can either be a hex string or a byte array), and one of `keyPair` (a
keyPair to sign the payload with). You'll get a signed extrinsic that you can send to the Dock chain:

```javascript
const blobId = DockBlobId.random(); // 32-bytes long hex string to use as the blob's id
const blobStruct = {
  id: blobId,
  blob: blobHexOrArray, // Contents of your blob as a hex string or byte array
};
const result = await dock.blob.new(blobStruct, didKeypair);
```

If everything worked properly `result` will indicate a successful transaction.
We'll see how to retrieve the blob next.

### Reading a Blob

A Blob can be retrieved by using the method `get` in the BlobModule class.
It accepts a `blobId` string param which can either be a fully-qualified blob id like `blob:dock:0x...`
or just its hex identifier. In response you will receive a two-element array:

```javascript
const chainBlob = await dock.blob.get(blobId);
```

`chainBlob`'s first element will be the blob's author (a DID). It's second element will be the contents of your
blob (`blobHexOrArray` in our previous example).

## Schemas

Since Schemas are stored on chain as a `Blob` in the Blob Storage module, the `Schema` class uses the `BlobModule`
class internally. Schemas are identified and retrieved by their unique `blobId`, a 32 byte long hex string. As
mentioned, the chain is agnostic to the contents of blobs and thus to schemas.

### Creating a Schema

The first step to creating a Schema is to initialize it, we can do that using the `Schema` class constructor which
accepts an (optional) `id` string as sole argument:

```javascript
const myNewSchema = new Schema(DockBlobId.random());
```

When an `id` isn't passed, a random `blobId` will be assigned as the schema's id.

```javascript
> myNewSchema.id
<- "blob:dock:5Ek98pDX61Dwo4EDmsogUkYMBqfFHtiS5hVS7xHuVvMByh3N"
```

Also worth noticing is the JSON representation of the schema as is right now, which can be achieved by calling
the `toJSON` method on your new schema:

```javascript
>  myNewSchema.toJSON()
<- {"id":"0x768c21de02890dad5dbf6f108b6822b865e4ea495bb7f43f8947714e90fcc060"}
```

where you can see that the schema's `id` gets modified with `getHexIdentifierFromBlobID`.

#### Setting a JSON Schema

A JSON schema can be added with the `setJSONSchema` method. It accepts a single argument `json` (an object that is
checked to be a valid JSON schema before being added):

```javascript
>   const someNewJSONSchema = {
         $schema: 'http://json-schema.org/draft-07/schema#',
         description: 'Dock Schema Example',
         type: 'object',
         properties: {
           id: {
             type: 'string',
           },
           emailAddress: {
             type: 'string',
             format: 'email',
           },
           alumniOf: {
             type: 'string',
           },
         },
         required: ['emailAddress', 'alumniOf'],
         additionalProperties: false,
       }
>   myNewSchema.setJSONSchema(someNewJSONSchema)
>   myNewSchema.schema === someNewJSONSchema
<-  true
```

#### Formatting for storage

Your new schema is now ready to be written to the Dock chain, the last step is to format it properly for the BlobModule
to be able to use it. That's where the `toBlob` method comes in handy:

```javascript
>   myNewSchema.toBlob()
<-  {
      id: ...,
      blob: ...,
    }
```

### Writing a Schema to the Dock chain

Writing a Schema to the Dock chain is similar to writing any other Blob. `1` is the key id for the on-chain public key corresponding to `keyPair`

```javascript
>  const formattedBlob = myNewSchema.toBlob(dockDID);
>  await myNewSchema.writeToChain(modules.blob, keypair);
```

### Reading a Schema from the Dock chain

Reading a Schema from the Dock chain can easily be achieved by using the `get` method from the `Schema` class.
It accepts a string `id` param (a fully-qualified blob id like "blob:dock:0x..." or just its hex identifier) and a
`dockAPI` instance:

```javascript
>  const result = await Schema.get(blob.id, modules.blob);
```

`result[0]` will be the author of the Schema, and `result[1]` will be the contents of the schema itself.

### Schemas in Verifiable Credentials

The [VCDM spec](https://www.w3.org/TR/vc-data-model/#data-schemas) specify how the `credentialSchema` property should be
used when present. Basically, once you've created and stored your Schema on chain, you can reference to it by its
`blobId` when issuing a Verifiable Credential. Let's see an example:

```javascript
>    const dockApi = new DockAPI();
>    const CoreResolver = new CoreResolver(dockApi);
>    let validCredential = new VerifiableCredential('https://example.com/credentials/123');
>    validCredential.addContext('https://www.w3.org/2018/credentials/examples/v1');
>    const ctx1 = {
      '@context': {
        emailAddress: 'https://schema.org/email',
      },
    };
>    validCredential.addContext(ctx1);
>    validCredential.addType('AlumniCredential');
>    validCredential.addSubject({
      id: dockDID,
      alumniOf: 'Example University',
      emailAddress: 'john@gmail.com',
    });
>    validCredential.setSchema(blobHexIdToQualified(blobId), 'JsonSchemaValidator2018');
>    await validCredential.sign(keyDoc);
>    await validCredential.verify({
       resolver: CoreResolver,
       compactProof: true,
     });
```

Assuming that the `blobId` points to a schema taken from the previous examples, the verification above would fail if I
the `credentialSubject` in the Verifiable Credential didn't have one of the `alumniOf` or `emailAddress` properties.

### Schemas in Verifiable Presentations

The current implementation does not specify a way to specify a schema for a Verifiable Presentation itself.
However, a Verifiable Presentation may contain any number of Verifiable Credentials, each of which may or may not use a
Schema themselves. The `verify` method for Verifiable Presentations will enforce a schema validation in each of the
Verifiable Credentials contained in a presentation that are using the `credentialSchema` and `credentialSubject`
properties simultaneously.
This means that the verification of an otherwise valid Verifiable Presentation will fail if one of the Verifiable
Credentials contained within it uses a Schema and fails to pass schema validation.
