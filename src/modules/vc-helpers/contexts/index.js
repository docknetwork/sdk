import credentialsContext from 'credentials-context';
import vc_examples_v1 from './vcExamplesV1';
import odrl from './odrl';
import schema from './schema.json';


export default new Map([
  ...credentialsContext.contexts,
  [
    'https://www.w3.org/2018/credentials/examples/v1',
    vc_examples_v1
  ],
  [
    'https://www.w3.org/ns/odrl.jsonld',
    odrl
  ],
  [
    'http://schema.org',
    schema
  ]
]);
