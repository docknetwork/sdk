import { Ed25519Keypair, Secp256k1Keypair } from "../src/keypairs";
import { randomAsHex } from "../src/utils";

describe.each([Ed25519Keypair, Secp256k1Keypair])("Keypairs", (Keypair) => {
  const createKp = (source) =>
    Keypair === Ed25519Keypair
      ? Keypair.fromSeed(source)
      : Keypair.fromEntropy(source);

  it(`${Keypair.name} fromSeed/fromEntropy method`, async () => {
    const seed = randomAsHex(Keypair.SeedSize);
    const kp = createKp(seed);
    expect(kp.keyPair).toBeTruthy();
    expect(createKp(seed)).toEqual(kp);
  });

  it(`${Keypair.name} fromPrivateKey method`, async () => {
    const randKp = Keypair.random();

    const privateKey = randKp.privateKey();
    const kp = Keypair.fromPrivateKey(privateKey);
    expect(kp.keyPair).toBeTruthy();
    expect(Keypair.fromPrivateKey(privateKey)).toEqual(kp);
  });

  it(`${Keypair.name} random method`, async () => {
    const kp = Keypair.random();
    expect(kp.keyPair).toBeTruthy();
    expect(Keypair.random()).not.toEqual(kp);
  });

  it(`${Keypair.name} getPublicKey method`, async () => {
    const seed = randomAsHex(Keypair.SeedSize);
    const kp = createKp(seed);
    const publicKey = kp.publicKey();
    expect(publicKey).toBeInstanceOf(Keypair.Signature.PublicKey);
  });

  it(`${Keypair.name} getPrivateKey method`, async () => {
    const seed = randomAsHex(Keypair.SeedSize);
    const kp = createKp(seed);
    const privateKey = kp.privateKey();
    expect(privateKey).toBeInstanceOf(Uint8Array);
  });

  it(`${Keypair.name} sign method`, async () => {
    const seed = randomAsHex(Keypair.SeedSize);
    const kp = createKp(seed);
    const message = "Hello, World!";
    const signature = kp.sign(message);
    expect(signature).toBeInstanceOf(Keypair.Signature);
  });

  it(`${Keypair.name} static verify method`, async () => {
    const seed = randomAsHex(Keypair.SeedSize);
    const kp = createKp(seed);
    const message = "Hello, World!";
    const signature = kp.sign(message);
    const publicKey = kp.publicKey();
    expect(kp.constructor.verify(message, signature, publicKey)).toBe(true);
  });

  it(`${Keypair.name} privateKey method`, async () => {
    const seed = randomAsHex(Keypair.SeedSize);
    const kp = createKp(seed);
    const privateKey = kp.privateKey();
    expect(privateKey).toBeInstanceOf(Uint8Array);
  });

  it(`${Keypair.name} publicKey method`, async () => {
    const seed = randomAsHex(Keypair.SeedSize);
    const kp = createKp(seed);
    const publicKey = kp.publicKey();
    expect(publicKey).toBeInstanceOf(Keypair.Signature.PublicKey);
  });

  it(`${Keypair.name} constructor`, async () => {
    const kp = createKp(randomAsHex(Keypair.SeedSize));
    expect(kp.keyPair).toBeTruthy();
    expect(new Keypair(kp.privateKey(), "private").keyPair).toBeTruthy();
  });
});
