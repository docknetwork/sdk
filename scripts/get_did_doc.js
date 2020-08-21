// Import Dock API
import dock from '../src/api';

// The following can be tweaked depending on where the node is running and what
// account is to be used for sending the transaction.
const { FullNodeEndpoint } = process.env;

async function getDIDDoc(dockDID) {
  console.log('Getting DID now.');
  // Check if DID exists
  const result = await dock.did.getDocument(dockDID);
  console.log('DID Document:', JSON.stringify(result, null, 2));
  process.exit(0);
}

if (process.argv.length !== 3) {
  console.error('Need one and only one argument as the DID', process.argv);
  process.exit(2);
}

dock.init({
  address: FullNodeEndpoint,
})
  .then(() => getDIDDoc(process.argv[2]))
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
