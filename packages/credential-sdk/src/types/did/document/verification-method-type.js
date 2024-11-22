import { TypedEnum, Null } from '../../generic';
import {
  EcdsaSecp256k1VerKeyName,
  Ed255192020VerKeyName,
  Ed25519VerKeyName,
  Sr25519VerKeyName,
  Bls12381BBSDockVerKeyName,
  Bls12381BBS23DockVerKeyName,
  Bls12381PSDockVerKeyName,
  Bls12381BBDT16DockVerKeyName,
} from '../../../vc/crypto';

export class VerificationMethodType extends TypedEnum {}
export class Ed25519Verification2018Method extends VerificationMethodType {
  static Class = Null;

  static Type = Ed25519VerKeyName;
}
export class Ed25519Verification2020Method extends VerificationMethodType {
  static Class = Null;

  static Type = Ed255192020VerKeyName;
}
export class Sr25519Verification2020Method extends VerificationMethodType {
  static Class = Null;

  static Type = Sr25519VerKeyName;
}
export class EcdsaSecp256k1VerificationKey2019 extends VerificationMethodType {
  static Class = Null;

  static Type = EcdsaSecp256k1VerKeyName;
}
export class X25519KeyAgreementKey2019 extends VerificationMethodType {
  static Class = Null;

  static Type = 'X25519KeyAgreementKey2019';
}
export class Bls12381G2VerificationKeyDock2022 extends VerificationMethodType {
  static Class = Null;

  static Type = Bls12381BBS23DockVerKeyName;
}
export class Bls12381BBSVerificationKeyDock2023 extends VerificationMethodType {
  static Class = Null;

  static Type = Bls12381BBSDockVerKeyName;
}
export class Bls12381BBDT16VerificationKeyDock2024 extends VerificationMethodType {
  static Class = Null;

  static Type = Bls12381BBDT16DockVerKeyName;
}
export class Bls12381PSVerificationKeyDock2023 extends VerificationMethodType {
  static Class = Null;

  static Type = Bls12381PSDockVerKeyName;
}
VerificationMethodType.bindVariants(
  Ed25519Verification2018Method,
  Ed25519Verification2020Method,
  Sr25519Verification2020Method,
  EcdsaSecp256k1VerificationKey2019,
  X25519KeyAgreementKey2019,
  Bls12381G2VerificationKeyDock2022,
  Bls12381BBSVerificationKeyDock2023,
  Bls12381BBDT16VerificationKeyDock2024,
  Bls12381PSVerificationKeyDock2023,
);
