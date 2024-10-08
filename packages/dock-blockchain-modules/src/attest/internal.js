import {
  Attest,
  DockDidOrDidMethodKey,
} from '@docknetwork/credential-sdk/types';
import { createInternalDockModule } from '../common';
import { SetClaim } from './actions';

const didMethods = {
  setClaim: (priority, iri, _, __, nonce) => new SetClaim(new Attest(priority, iri), nonce),
};

export default class DockInternalAttestModule extends createInternalDockModule({
  didMethods,
}) {
  static Prop = 'attest';

  static MethodNameOverrides = {
    setClaim: 'SetAttestationClaim',
  };

  async attest(did) {
    return Attest.from(
      await this.query.attestations(DockDidOrDidMethodKey.from(did)),
    );
  }
}
