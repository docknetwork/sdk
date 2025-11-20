export default {
  "https://ld.truvera.io/credentials/extensions-v1": {
    "@context": {
      "@version": 1.1,
      "name": "https://ld.truvera.io/extensions/v1/#name",
      "description": "https://ld.truvera.io/extensions/v1/#description",
      "logo": "https://ld.truvera.io/extensions/v1/#logo",
      "DockVerifiableCredential": "https://ld.truvera.io/extensions/v1/#DockVerifiableCredential"
    }
  },
  "https://schema.truvera.io/BasicCredential-V2-1703777584571.json": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "name": "Basic Credential",
  },
  "https://gist.githubusercontent.com/lovesh/67bdfd354cfaf4fb853df4d6713f4610/raw":
    {
      id: "https://gist.githubusercontent.com/lovesh/67bdfd354cfaf4fb853df4d6713f4610/raw",
      type: "EcdsaSecp256k1VerificationKey2019",
      publicKeyBase58: "222iuczftmixHLkW6wszwyeAfYCZA7bzQMhkEXpeNVJrk",
      "@context": "https://w3id.org/security/v2",
      controller:
        "https://gist.githubusercontent.com/lovesh/312d407e3a16be0e7d5e43169e824958/raw",
    },
  "https://gist.githubusercontent.com/lovesh/312d407e3a16be0e7d5e43169e824958/raw":
    {
      "@context": "https://w3id.org/security/v2",
      id: "https://gist.githubusercontent.com/lovesh/312d407e3a16be0e7d5e43169e824958/raw",
      assertionMethod: [
        "https://gist.githubusercontent.com/lovesh/67bdfd354cfaf4fb853df4d6713f4610/raw",
      ],
      authentication: [
        "https://gist.githubusercontent.com/lovesh/67bdfd354cfaf4fb853df4d6713f4610/raw",
      ],
    },

    "did:cheqd:testnet:60b1d818-f8d0-4609-b299-a03d82c7f754#key-1": {
      "id": "did:cheqd:testnet:60b1d818-f8d0-4609-b299-a03d82c7f754#key-1",
      "type": "Ed25519VerificationKey2018",
      "controller": "did:cheqd:testnet:60b1d818-f8d0-4609-b299-a03d82c7f754",
      "publicKeyBase58": "Hwh6yP1dZUU9wn4wvrv5cwDfYCi5xV3dYFAtGrqsYVHz",
      controller: "did:cheqd:testnet:60b1d818-f8d0-4609-b299-a03d82c7f754",
    },


  "did:cheqd:testnet:60b1d818-f8d0-4609-b299-a03d82c7f754": {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security/suites/ed25519-2018/v1"
      ],
      "id": "did:cheqd:testnet:60b1d818-f8d0-4609-b299-a03d82c7f754",
      "controller": [
        "did:cheqd:testnet:60b1d818-f8d0-4609-b299-a03d82c7f754"
      ],
      "verificationMethod": [
        {
          "id": "did:cheqd:testnet:60b1d818-f8d0-4609-b299-a03d82c7f754#key-1",
          "type": "Ed25519VerificationKey2018",
          "controller": "did:cheqd:testnet:60b1d818-f8d0-4609-b299-a03d82c7f754",
          "publicKeyBase58": "Hwh6yP1dZUU9wn4wvrv5cwDfYCi5xV3dYFAtGrqsYVHz"
        }
      ],
      "authentication": [
        "did:cheqd:testnet:60b1d818-f8d0-4609-b299-a03d82c7f754#key-1"
      ],
      "assertionMethod": [
        "did:cheqd:testnet:60b1d818-f8d0-4609-b299-a03d82c7f754#key-1"
      ],
      "service": [
        {
          "id": "did:cheqd:testnet:60b1d818-f8d0-4609-b299-a03d82c7f754#agent-1",
          "type": "LinkedAgent",
          "serviceEndpoint": [
            "MyAgentDID",
            "https://myagent.com"
          ]
        },
        {
          "id": "did:cheqd:testnet:60b1d818-f8d0-4609-b299-a03d82c7f754#didcomm",
          "type": "DIDCommMessaging",
          "serviceEndpoint": "https://api-testnet.truvera.io/messaging/did%3Acheqd%3Atestnet%3A60b1d818-f8d0-4609-b299-a03d82c7f754/receive",
          "accept": [
            "didcomm/v2",
            "didcomm/aip2;env=rfc587"
          ]
        }
      ]
  },

  "urn:EcdsaSecp256k1VerificationKey2019#keys-1": {
    id: "urn:EcdsaSecp256k1VerificationKey2019#keys-1",
    type: "EcdsaSecp256k1VerificationKey2019",
    publicKeyBase58: "222iuczftmixHLkW6wszwyeAfYCZA7bzQMhkEXpeNVJrk",
    "@context": "https://w3id.org/security/v2",
    controller: "urn:EcdsaSecp256k1VerificationKey2019",
  },
  "urn:EcdsaSecp256k1VerificationKey2019": {
    "@context": "https://w3id.org/security/v2",
    id: "urn:EcdsaSecp256k1VerificationKey2019",
    assertionMethod: ["urn:EcdsaSecp256k1VerificationKey2019#keys-1"],
    authentication: ["urn:EcdsaSecp256k1VerificationKey2019#keys-1"],
  },

  "urn:JsonWebKey2020": {
    "@context": "https://w3id.org/security/v2",
    id: "urn:JsonWebKey2020",
    assertionMethod: ["urn:JsonWebKey2020#keys-1"],
    authentication: ["urn:JsonWebKey2020#keys-1"],
  },
  "urn:JsonWebKey2020#keys-1": {
    "@context": "https://w3id.org/security/suites/jws-2020/v1",
    id: "urn:JsonWebKey2020#keys-1",
    controller: "urn:JsonWebKey2020",
    type: "JsonWebKey2020",
    publicKeyJwk: {
      kty: "EC",
      crv: "P-384",
      x: "dMtj6RjwQK4G5HP3iwOD94RwbzPhS4wTZHO1luk_0Wz89chqV6uJyb51KaZzK0tk",
      y: "viPKF7Zbc4FxKegoupyVRcBr8TZHFxUrKQq4huOAyMuhTYJbFpAwMhIrWppql02E",
    },
  },
};
