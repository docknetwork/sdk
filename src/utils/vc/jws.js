import base64url from 'base64url';

const detachedHeaderParams = {
  b64: false,
  crit: ['b64'],
};

// Taken from https://github.com/transmute-industries/verifiable-data/blob/main/packages/jose-ld/src/JWS/createSigner.ts
export async function signJWS(signer, type, options, data) {
  if (!type) {
    return signer.sign({ data });
  }

  const header = {
    alg: type,
    ...options.header,
    ...(options.detached ? detachedHeaderParams : undefined),
  };
  const encodedHeader = base64url.encode(JSON.stringify(header));
  const encodedPayload = base64url.encode(
    data instanceof Uint8Array
      ? Buffer.from(data).toString('utf-8')
      : JSON.stringify(data),
  );

  const toBeSigned = options.detached
    ? new Uint8Array(
      Buffer.concat([
        Buffer.from(encodedHeader, 'utf8'),
        Buffer.from('.', 'utf-8'),
        data,
      ]),
    )
    : new Uint8Array(Buffer.from(`${encodedHeader}.${encodedPayload}`));

  const signature = await signer.sign({ data: toBeSigned });

  // If not, encode it ourselves
  return options.detached
    ? `${encodedHeader}..${base64url.encode(Buffer.from(signature))}`
    : `${encodedHeader}.${encodedPayload}.${base64url.encode(
      Buffer.from(signature),
    )}`;
}

export function createJws({ encodedHeader, verifyData }) {
  const buffer = Buffer.concat([
    Buffer.from(`${encodedHeader}.`, 'utf8'),
    Buffer.from(verifyData.buffer, verifyData.byteOffset, verifyData.length),
  ]);
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.length);
}
