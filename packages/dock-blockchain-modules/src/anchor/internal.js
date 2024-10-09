import { Anchor } from '@docknetwork/credential-sdk/types';
import { createInternalDockModule } from '../common';

const accountMethods = {
  deploy: (anchor) => [Anchor.from(anchor)],
};

export default class DockInternalAnchorModule extends createInternalDockModule({
  accountMethods,
}) {
  static Prop = 'anchor';
}
