import { cryptoWaitReady, randomAsHex } from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/api';
import { initializeWasm } from '@docknetwork/crypto-wasm-ts';

import {
  generateEcdsaSecp256k1Keypair,
  getPublicKeyFromKeyringPair,
  getSignatureFromKeyringPair,
  verifyEcdsaSecp256k1Sig,
} from '../../src/utils/misc';
import { ReusablePromiseMap, retry, timeout } from '../../src/utils/async';
import {
  PublicKeyEd25519,
  PublicKeySr25519,
  PublicKeySecp256k1,
} from '../../src/public-keys';
import {
  SignatureEd25519,
  SignatureSr25519,
  SignatureSecp256k1,
} from '../../src/signatures';
import { isHexWithGivenByteSize } from '../../src/utils/codec';
import { expandJSONLD } from '../../src/utils/vc';
import {
  getCredentialStatus,
  isAccumulatorRevocationStatus,
} from '../../src/utils/revocation';

describe('Testing isHexWithGivenByteSize', () => {
  test('isHexWithGivenByteSize rejects strings not starting with 0x', () => {
    expect(isHexWithGivenByteSize('12')).toBe(false);
  });

  test('isHexWithGivenByteSize rejects strings with invalid hex', () => {
    expect(isHexWithGivenByteSize('0x1h')).toBe(false);
  });

  test('isHexWithGivenByteSize rejects strings with non-full byte', () => {
    expect(isHexWithGivenByteSize('0x123')).toBe(false);
  });

  test('isHexWithGivenByteSize rejects strings with byte size 0', () => {
    expect(isHexWithGivenByteSize('0x')).toBe(false);
  });

  test('isHexWithGivenByteSize rejects strings not matching expected byte size', () => {
    expect(isHexWithGivenByteSize('0x12', 2)).toBe(false);
    expect(isHexWithGivenByteSize('0x1234', 1)).toBe(false);
    expect(isHexWithGivenByteSize('0x1234', 0)).toBe(false);
  });

  test('isHexWithGivenByteSize accepts correct hex string with full bytes', () => {
    expect(isHexWithGivenByteSize('0x12')).toBe(true);
    expect(isHexWithGivenByteSize('0x1234')).toBe(true);
    expect(isHexWithGivenByteSize('0x1234ef')).toBe(true);
  });

  test('isHexWithGivenByteSize accepts correct hex string matching expected byte size', () => {
    expect(isHexWithGivenByteSize('0x12', 1)).toBe(true);
    expect(isHexWithGivenByteSize('0x1234', 2)).toBe(true);
    expect(isHexWithGivenByteSize('0x1234ef', 3)).toBe(true);
  });

  const crateElapsedTimeSec = () => {
    const start = +new Date();

    return (expected) => expect(Math.round((+new Date() - start) / 1e2) / 10).toBe(expected);
  };

  test('`timeout` works properly', async () => {
    const expectElapsedTimeSec = crateElapsedTimeSec();

    await Promise.all(
      [
        async () => {
          expect(await timeout(1e2)).toBe(void 0);
          expectElapsedTimeSec(0.1);
        },
        async () => {
          expect(await timeout(3e2, () => 'a')).toBe('a');
          expectElapsedTimeSec(0.3);
        },
        async () => {
          await expect(() => timeout(2e2, () => {
            throw new Error('Rejected timeout');
          })).rejects.toThrowErrorMatchingSnapshot();
          expectElapsedTimeSec(0.2);
        },
      ].map((f) => f()),
    );
  });

  test('`ReusablePromiseMap` works properly', async () => {
    const map = new ReusablePromiseMap();

    const results = await Promise.all([
      map.callByKey(1, () => timeout(5e2, () => 10)),
      timeout(2e2, () => map.callByKey(1, () => Promise.resolve(2))),
      timeout(7e2, () => map.callByKey(1, () => Promise.resolve(1))),
    ]);

    expect(results).toEqual([10, 10, 1]);

    await expect(() => map.callByKey(10, () => Promise.reject(1))).rejects;
    expect(map.map.size).toBe(0);
  });

  test('`ReusablePromiseMap` capacity', async () => {
    const map = new ReusablePromiseMap({ capacity: 2 });

    const expectElapsedTimeSec = crateElapsedTimeSec();

    let results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => map.callByKey(i, () => timeout(5e2, () => i))),
    );

    expect(results).toEqual(Array.from({ length: 10 }, (_, i) => i));
    expect(map.map.size).toBe(0);
    expect(map.queue.length).toBe(0);

    expectElapsedTimeSec(2.5);

    const mapWithBoundQueue = new ReusablePromiseMap({
      capacity: 1,
      queueCapacity: 3,
    });

    results = await Promise.all([
      () => mapWithBoundQueue.callByKey(
        1,
        () => timeout(5e2, () => 1),
      ),
      () => mapWithBoundQueue.callByKey(
        2,
        () => timeout(5e2, () => 2),
      ),
      () => mapWithBoundQueue.callByKey(
        3,
        () => timeout(5e2, () => 3),
      ),
      () => mapWithBoundQueue.callByKey(
        3,
        () => timeout(5e2, () => 4),
      ),
      () => expect(() => mapWithBoundQueue.callByKey(
        4,
        () => timeout(5e2, () => 5),
      )).rejects.toThrowErrorMatchingSnapshot(),
    ].map((f) => f()));

    expect(results).toEqual([1, 2, 3, 4, undefined]);
  });

  test('`retry` works properly', async () => {
    const makeCtrFn = (ctr, placeholder = new Promise((_) => {})) => async () => {
      if (!ctr--) {
        return 0;
      } else {
        return placeholder;
      }
    };
    const expectElapsedTimeSec = crateElapsedTimeSec();

    await Promise.all(
      [
        async () => {
          const onTimeoutExceeded = jest.fn((retrySym) => retrySym);

          expect(
            await retry(makeCtrFn(5), 3e2, { delay: 2e2, onTimeoutExceeded }),
          ).toBe(0);
          expectElapsedTimeSec(2.5);

          expect(onTimeoutExceeded).toBeCalledTimes(5);
        },
        async () => {
          expect(await retry(makeCtrFn(5), 3e2)).toBe(0);
          expectElapsedTimeSec(1.5);
        },
        async () => {
          expect(await retry(makeCtrFn(0), 3e2)).toBe(0);
          expectElapsedTimeSec(0);
        },
        async () => {
          await expect(() => retry(makeCtrFn(5), 3e2, { maxAttempts: 3 })).rejects.toThrowErrorMatchingSnapshot();
          expectElapsedTimeSec(1.2);
        },
        async () => {
          expect(
            await retry(makeCtrFn(5), 3e2, { maxAttempts: 5, delay: 2e2 }),
          ).toBe(0);
          expectElapsedTimeSec(2.5);
        },
        async () => {
          await expect(() => retry(makeCtrFn(100), 1, { maxAttempts: 99 })).rejects.toThrowErrorMatchingSnapshot();
          expectElapsedTimeSec(0.1);
        },
        async () => {
          expect(
            await retry(makeCtrFn(4, Promise.reject(1)), 3e2, {
              onError: (_, next) => next,
            }),
          ).toBe(0);
          expectElapsedTimeSec(0);
        },
        async () => {
          expect(
            await retry(makeCtrFn(4, Promise.reject(1)), 3e2, {
              onError: (error) => error,
            }),
          ).toBe(1);
          expectElapsedTimeSec(0);
        },
        async () => {
          await expect(() => retry(makeCtrFn(4, Promise.reject(1)), 3e2, {
            onError: () => {
              throw new Error('From `onError` callback');
            },
          })).rejects.toThrowErrorMatchingSnapshot();
          expectElapsedTimeSec(0);
        },
      ].map((f) => f()),
    );
  });
});

describe('Testing public key and signature instantiation from keyring', () => {
  beforeAll(async () => {
    await initializeWasm();
    await cryptoWaitReady();
  });

  test('getCorrectPublicKeyFromKeyringPair returns correct public key from ed25519 pair', () => {
    const keyring = new Keyring();
    const pair = keyring.addFromUri(randomAsHex(32), null, 'ed25519');
    const pk = getPublicKeyFromKeyringPair(pair);
    expect(pk instanceof PublicKeyEd25519).toBe(true);
  });

  test('getCorrectPublicKeyFromKeyringPair returns correct public key from sr25519 pair', () => {
    const keyring = new Keyring();
    const pair = keyring.addFromUri(randomAsHex(32), null, 'sr25519');
    const pk = getPublicKeyFromKeyringPair(pair);
    expect(pk instanceof PublicKeySr25519).toBe(true);
  });

  test('getCorrectPublicKeyFromKeyringPair returns correct public key from secp256k1 pair', () => {
    const pair = generateEcdsaSecp256k1Keypair(randomAsHex(32));
    const pk = getPublicKeyFromKeyringPair(pair);
    expect(pk instanceof PublicKeySecp256k1).toBe(true);
  });

  test('getCorrectSignatureFromKeyringPair returns correct signature from ed25519 pair', () => {
    const keyring = new Keyring();
    const pair = keyring.addFromUri(randomAsHex(32), null, 'ed25519');
    const sig = getSignatureFromKeyringPair(pair, [1, 2]);
    expect(sig instanceof SignatureEd25519).toBe(true);
  });

  test('getCorrectSignatureFromKeyringPair returns correct signature from sr25519 pair', () => {
    const keyring = new Keyring();
    const pair = keyring.addFromUri(randomAsHex(32), null, 'sr25519');
    const sig = getSignatureFromKeyringPair(pair, [1, 2]);
    expect(sig instanceof SignatureSr25519).toBe(true);
  });

  test('getCorrectSignatureFromKeyringPair returns correct signature from secp256k1 pair', () => {
    const pair = generateEcdsaSecp256k1Keypair(randomAsHex(32));
    const sig = getSignatureFromKeyringPair(pair, [1, 2]);
    expect(sig instanceof SignatureSecp256k1).toBe(true);
  });
});

describe('Testing Ecdsa with secp256k1', () => {
  test('Signing and verification works', () => {
    const msg = [
      1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8, 1,
      2, 3, 4, 5, 6, 7, 8,
    ];
    const entropy = '0x4c94485e0c21ae6c41ce1dfe7b6bfaceea5ab68e40a2476f50208e526f506080';
    const pair = generateEcdsaSecp256k1Keypair(entropy);
    const pk = PublicKeySecp256k1.fromKeyringPair(pair);
    const sig = new SignatureSecp256k1(msg, pair);
    expect(verifyEcdsaSecp256k1Sig(msg, sig, pk)).toBe(true);

    const msg1 = [
      1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8, 1,
      2, 3, 4, 5, 6, 7, 8, 9,
    ];
    const sig1 = new SignatureSecp256k1(msg1, pair);
    expect(verifyEcdsaSecp256k1Sig(msg1, sig1, pk)).toBe(true);
    expect(msg !== msg1).toBe(true);
    expect(sig !== sig1).toBe(true);

    const msg2 = [
      1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8, 1,
      2, 3, 4, 5, 6, 7,
    ];
    const sig2 = new SignatureSecp256k1(msg2, pair);
    expect(verifyEcdsaSecp256k1Sig(msg2, sig2, pk)).toBe(true);
    expect(msg2 !== msg1).toBe(true);
    expect(sig2 !== sig1).toBe(true);
  });
});

describe('Detecting accumulator status', () => {
  test('works', async () => {
    const credential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        {
          dk: 'https://ld.dock.io/credentials#',
          PermanentResidentCard: 'dk:PermanentResidentCard',
          PermanentResident: 'dk:PermanentResident',
          Person: 'dk:Person',
          givenName: 'dk:givenName',
          familyName: 'dk:familyName',
          lprNumber: 'dk:lprNumber',
          name: 'http://schema.org/name',
          description: 'http://schema.org/description',
        },
      ],
      credentialStatus: {
        id: 'dock:accumulator:0x4e8ae3b33f1601844f31dd9d121adb0157bd609b04d3449d0fabe45bd057c93f',
        type: 'DockVBAccumulator2022',
        revocationCheck: 'membership',
        revocationId: '4',
      },
      id: 'http://localhost:3001/8c818a2fbf84bb14720ceea764af21a7023141b231b319e45f0753d57955ecf8',
      type: ['VerifiableCredential', 'PermanentResidentCard'],
      credentialSubject: {
        id: 'did:dock:5GLu8vCdG2CUTpuq3f7TehjYbM3izoo64vovKgwbAdrv6Dq2',
        type: ['PermanentResident', 'Person'],
        givenName: 'JOHN',
        familyName: 'SMITH',
        lprNumber: 1234,
      },
      issuer: 'did:dock:5GLu8vCdG2CUTpuq3f7TehjYbM3izoo64vovKgwbAdrv6Dq2',
      name: 'Permanent Resident Card',
      description: 'Government of Example Permanent Resident Card.',
    };

    let expandedCredential = await expandJSONLD(credential);
    let status = getCredentialStatus(expandedCredential);
    expect(isAccumulatorRevocationStatus(status)).toEqual(true);

    credential.credentialStatus = {
      id: 'rev-reg:dock:0x0194',
      type: 'CredentialStatusList2017',
    };

    expandedCredential = await expandJSONLD(credential);
    status = getCredentialStatus(expandedCredential);
    expect(isAccumulatorRevocationStatus(status)).toEqual(false);
  });
});
