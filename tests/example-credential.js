export default {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://www.w3.org/2018/credentials/examples/v1',
    {
      emailAddress: 'https://schema.org/email',
      alumniOf: 'https://schema.org/alumniOf',
    },
  ],
  id: 'uuid:0x9b561796d3450eb2673fed26dd9c07192390177ad93e0835bc7a5fbb705d52bc',
  type: [
    'VerifiableCredential',
    'AlumniCredential',
  ],
  issuanceDate: '2020-03-18T19:23:24Z',
  credentialSchema: { // this is the schema
    id: 'blob:dock:5C78GCA',
    type: 'JsonSchemaValidator2018',
  },
  credentialSubject: {
    id: 'did:dock:5GL3xbkr3vfs4qJ94YUHwpVVsPSSAyvJcafHz1wNb5zrSPGi',
    emailAddress: 'johnsmith@example.com',
    alumniOf: 'Example University',
  },
  credentialStatus: {
    id: 'rev-reg:dock:0x0194...',
    type: 'CredentialStatusList2017',
  },
  issuer: 'did:dock:5GUBvwnV6UyRWZ7wjsBptSquiSHGr9dXAy8dZYUR9WdjmLUr',
  proof: {
    type: 'Ed25519Signature2018',
    created: '2020-04-22T07:50:13Z',
    jws: 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..GBqyaiTMhVt4R5P2bMGcLNJPWEUq7WmGHG7Wc6mKBo9k3vSo7v7sRKwqS8-m0og_ANKcb5m-_YdXC2KMnZwLBg',
    proofPurpose: 'assertionMethod',
    verificationMethod: 'did:dock:5GUBvwnV6UyRWZ7wjsBptSquiSHGr9dXAy8dZYUR9WdjmLUr#keys-1',
  },
};
