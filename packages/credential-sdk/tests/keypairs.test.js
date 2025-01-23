import { Ed25519Keypair, Secp256k1Keypair } from "../src/keypairs";
import { randomAsHex } from "../src/utils";

describe.each([Ed25519Keypair, Secp256k1Keypair])("Keypairs", (Keypair) => {
  it(`${Keypair.name} fromSeed method`, async () => {
    const seed = randomAsHex(Keypair.SeedSize);
    const kp = Keypair.fromSeed(seed);
    expect(kp.keyPair).toBeTruthy();
  });

  it(`${Keypair.name} random method`, async () => {
    const kp = Keypair.random();
    expect(kp.keyPair).toBeTruthy();
  });

  it(`${Keypair.name} fromPrivateKey method`, async () => {
    const randKp = Keypair.random();

    const privateKey = randKp.privateKey();
    const kp = Keypair.fromPrivateKey(privateKey);
    expect(kp.keyPair).toBeTruthy();
    expect(randKp).toEqual(kp);
  });

  it(`${Keypair.name} getPublicKey method`, async () => {
    const seed = randomAsHex(Keypair.SeedSize);
    const kp = Keypair.fromSeed(seed);
    const publicKey = kp.publicKey();
    expect(publicKey).toBeInstanceOf(Keypair.Signature.PublicKey);
  });

  it(`${Keypair.name} getPrivateKey method`, async () => {
    const seed = randomAsHex(Keypair.SeedSize);
    const kp = Keypair.fromSeed(seed);
    const privateKey = kp.privateKey();
    expect(privateKey).toBeInstanceOf(Uint8Array);
  });

  it(`${Keypair.name} sign method`, async () => {
    const seed = randomAsHex(Keypair.SeedSize);
    const kp = Keypair.fromSeed(seed);
    const message = "Hello, World!";
    const signature = kp.sign(message);
    expect(signature).toBeInstanceOf(Keypair.Signature);
  });

  it(`${Keypair.name} static verify method`, async () => {
    const seed = randomAsHex(Keypair.SeedSize);
    const kp = Keypair.fromSeed(seed);
    const message = "Hello, World!";
    const signature = kp.sign(message);
    const publicKey = kp.publicKey();
    expect(kp.constructor.verify(message, signature, publicKey)).toBe(true);
  });

  it(`${Keypair.name} privateKey method`, async () => {
    const seed = randomAsHex(Keypair.SeedSize);
    const kp = Keypair.fromSeed(seed);
    const privateKey = kp.privateKey();
    expect(privateKey).toBeInstanceOf(Uint8Array);
  });

  it(`${Keypair.name} publicKey method`, async () => {
    const seed = randomAsHex(Keypair.SeedSize);
    const kp = Keypair.fromSeed(seed);
    const publicKey = kp.publicKey();
    expect(publicKey).toBeInstanceOf(Keypair.Signature.PublicKey);
  });

  it(`${Keypair.name} constructor`, async () => {
    const kp = new Keypair(randomAsHex(Keypair.SeedSize), "seed");
    expect(kp.keyPair).toBeTruthy();
    expect(new Keypair(kp.privateKey(), "private").keyPair).toBeTruthy();
  });
});
