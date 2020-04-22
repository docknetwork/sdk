# Verifiable Credentials
Credentials are a part of our daily lives: driver's licenses are used to assert that we are capable of operating a motor vehicle, university degrees can be used to assert our level of education, and government-issued passports enable us to travel between countries. These credentials provide benefits to us when used in the physical world, but their use on the Web continues to be elusive.

Currently it is difficult to express education qualifications, healthcare data, financial account details, and other sorts of third-party verified machine-readable personal information on the Web. The difficulty of expressing digital credentials on the Web makes it challenging to receive the same benefits through the Web that physical credentials provide us in the physical world.

The [Verifiable Credentials Data Model 1.0 (VCDM)](https://www.w3.org/TR/vc-data-model/) specification provides a standard way to express credentials on the Web in a way that is cryptographically secure, privacy respecting, and machine-verifiable.

## Participants and workflow
- Credentials are issued by an entity called the **issuer**.
- **Issuer** issues the credential about a **subject** by signing the credential with his key. If the credential is revocable,
the issuer must specify how and from where revocation status must be checked. It is not necessary that revocation is managed by
the issuer, the issuer might designate a different authority for revocation.
- **Issuer** gives the credential to the **holder**. The **holder** might be the same as the **subject**.
- A service provider or anyone willing to check if the **holder** possesses certain credentials requests a **presentation** about those
credentials. This entity requesting the **presentation** is called the **verifier**. To protect against replay attacks, (a
verifier receiving the presentation and replaying the same presentation at some other verifier), a verifier must supply a
challenge that must be embedded in the presentation.
- **Holder** creates a **presentation** for the required credentials. The **presentation** must indicate which
credentials it is about and must be signed by the **holder** of the credentials.
- **Verifier** on receiving the presentation verifies the validity of each credential in the **presentation**. This includes
checking correctness of the data model of the credential, the authenticity by verifying the issuer's signature and revocation
status if the credential is revocable. It then checks whether the presentation contains the signature from the
**holder** on the presentation which also includes his given challenge.

## Issuing
To issue a verifiable credential, the issuer needs to have a public key that is accessible by the holder and verifier to verify the
signature (in `proof`) in the credential. Though the VCDM spec does not mandate it, an issuer in Dock must have a DID on chain.
This DID is present in the credential in the `issuer` field. An example credential where both the issuer and holder have Dock DIDs
```json
{
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://www.w3.org/2018/credentials/examples/v1'
    ],
    id: '0x9b561796d3450eb2673fed26dd9c07192390177ad93e0835bc7a5fbb705d52bc',
    type: [ 'VerifiableCredential', 'AlumniCredential' ],
    issuanceDate: '2020-03-18T19:23:24Z',
    credentialSubject: {
      id: 'did:dock:5GL3xbkr3vfs4qJ94YUHwpVVsPSSAyvJcafHz1wNb5zrSPGi',
      alumniOf: 'Example University'
    },
    issuer: 'did:dock:5GUBvwnV6UyRWZ7wjsBptSquiSHGr9dXAy8dZYUR9WdjmLUr',
    proof: {
      type: 'Ed25519Signature2018',
      created: '2020-04-22T07:50:13Z',
      jws: 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..GBqyaiTMhVt4R5P2bMGcLNJPWEUq7WmGHG7Wc6mKBo9k3vSo7v7sRKwqS8-m0og_ANKcb5m-_YdXC2KMnZwLBg',
      proofPurpose: 'assertionMethod',
      verificationMethod: 'did:dock:5GUBvwnV6UyRWZ7wjsBptSquiSHGr9dXAy8dZYUR9WdjmLUr#keys-1'
    }
}
```

## Presentation
The holder while creating the presentation signs it with his private key. For the verifier to verify the presentation, in
addition to verifying the issuer's signature, he needs to verify this signature as well, and for that he must know the
holder's public key. One way to achieve this is to make the holder have a DID too so that the verifier can look up the DID
on chain and learn the public key. An example presentation signed by the holder
```json
{
    '@context': [ 'https://www.w3.org/2018/credentials/v1' ],
    type: [ 'VerifiablePresentation' ],
    verifiableCredential: [
      {
          '@context': [
            'https://www.w3.org/2018/credentials/v1',
            'https://www.w3.org/2018/credentials/examples/v1'
          ],
          id: 'A large credential id with size > 32 bytes',
          type: [ 'VerifiableCredential', 'AlumniCredential' ],
          issuanceDate: '2020-03-18T19:23:24Z',
          credentialSubject: {
            id: 'did:dock:5GnE6u2dt9nC7tgf5vSdKy4gYX3jwqthbrBnjiay2LWETdrV',
            alumniOf: 'Example University'
          },
          credentialStatus: {
            id: 'rev-reg:dock:0x0194db371bab472a9cc920b5dfb1447aad5a6db906c46ff378cf0fc337a0c8c0',
            type: 'CredentialStatusList2017'
          },
          issuer: 'did:dock:5CwAuM8cPetXWbZN2JhMFWtLjxZ6DokiDdHViGw2FfxC1Cya',
          proof: {
            type: 'Ed25519Signature2018',
            created: '2020-04-22T07:58:43Z',
            jws: 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..bENDgnK29BHRhP05ehbQkOPfqweppGyI7NeH02YT1hzSDEHseOzCDx-g9dS4lY-m_bElwbOptOlRnQ2g9MW7Ag',
            proofPurpose: 'assertionMethod',
            verificationMethod: 'did:dock:5CwAuM8cPetXWbZN2JhMFWtLjxZ6DokiDdHViGw2FfxC1Cya#keys-1'
          }
      }
    ],
    id: '0x4bd107aee17744dcec10208d7551620664dcba7e88ce11c2312c02df562754f1',
    proof: {
      type: 'Ed25519Signature2018',
      created: '2020-04-22T07:58:49Z',
      challenge: '0x6a5a5d58a99705c4d499fa7cdcdc62eeb2f742eb878456babf49b9a6669d0b76',
      domain: 'test domain',
      jws: 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..HW7bDjvsRETeM25a3BtMgER53FtzK6rUBX_46cFo-i6O1y7p_TM-ED2iSTrFBUrDc7vH8QqoeUTY8e5ir5RvCg',
      proofPurpose: 'authentication',
      verificationMethod: 'did:dock:5GnE6u2dt9nC7tgf5vSdKy4gYX3jwqthbrBnjiay2LWETdrV#keys-1'
    }
}
```

## Revocation
If the credential is revocable, the issuer must specify how the revocation check must be done in the `credentialStatus` field.
On Dock, credential revocation is managed with a revocation registry. There can be multiple registries on chain and each
registry has a unique id. It is recommended that the revocation authority creates a new registry for each credential type.
While issuing the credential, issuer embeds the revocation registry's id in the credential in the `credentialStatus` field.
An example credential with Dock revocation registry
```json
{
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://www.w3.org/2018/credentials/examples/v1'
    ],
    id: 'A large credential id with size > 32 bytes',
    type: [ 'VerifiableCredential', 'AlumniCredential' ],
    issuanceDate: '2020-03-18T19:23:24Z',
    credentialSubject: {
      id: 'did:dock:5GnE6u2dt9nC7tgf5vSdKy4gYX3jwqthbrBnjiay2LWETdrV',
      alumniOf: 'Example University'
    },
    credentialStatus: {
      id: 'rev-reg:dock:0x0194db371bab472a9cc920b5dfb1447aad5a6db906c46ff378cf0fc337a0c8c0',
      type: 'CredentialStatusList2017'
    },
    issuer: 'did:dock:5CwAuM8cPetXWbZN2JhMFWtLjxZ6DokiDdHViGw2FfxC1Cya',
    proof: {
      type: 'Ed25519Signature2018',
      created: '2020-04-22T07:58:43Z',
      jws: 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..bENDgnK29BHRhP05ehbQkOPfqweppGyI7NeH02YT1hzSDEHseOzCDx-g9dS4lY-m_bElwbOptOlRnQ2g9MW7Ag',
      proofPurpose: 'assertionMethod',
      verificationMethod: 'did:dock:5CwAuM8cPetXWbZN2JhMFWtLjxZ6DokiDdHViGw2FfxC1Cya#keys-1'
    }
}
```

To revoke a credential, the revocation authority (might be same as the issuer), puts a hash of the credential id in the revocation registry.
To check the revocation status of a credential, hash the credential id and query the registry id specified in the credential.
The revocation of a credential can be undone if the revocation registry supports undoing. Moreover, currently, each registry is
owned by a single DID so that DID can revoke a credential or undo the revocation. In future, Dock will support ownership of
the registry with mulitple DIDs and in different fashions, like any one of the owner DIDs could revoke or a threshold is needed,
etc. To learn more about revocation registries, refer the [revocation section](./tutorial_revocation.md) of the documentation.

