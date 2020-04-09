import VerifiableCredential from '../src/verifiable-credential';

// Sample credental data
const credentialId = 'blabla';
const credentialContext = 'https://www.w3.org/2018/credentials/examples/v1';
const credentialType = 'some_type';
const credentialSubject = {id: 'some_subject_id'};
const credentialStatus = {id: 'some_status_id', type: 'CredentialStatusList2017'};
const credentialIssuanceDate = '2020-03-18T19:23:24Z';
const credentialExpirationDate = '2021-03-18T19:23:24Z';

// Sample key for signing
const sampleKey = {
  id: 'https://gist.githubusercontent.com/faustow/13f43164c571cf839044b60661173935/raw',
  controller: 'https://gist.githubusercontent.com/faustow/3b48e353a9d5146e05a9c344e02c8c6f/raw',
  type: 'EcdsaSecp256k1VerificationKey2019',
  privateKeyBase58: 'D1HHZntuEUXuQm56VeHv1Ae1c4Rd1mdVeamm2BPKom3y',
  publicKeyBase58: 'zXwDsGkuq5gTLVMnb3jGUaW8vvzAjfZfNuJmP2PkZGJy'
};

async function main() {
  // Incrementally build a verifiable credential
  let credential = new VerifiableCredential(credentialId);
  try {
    credential.addContext(credentialContext);
    credential.addType(credentialType);
    credential.addSubject(credentialSubject);
    credential.setStatus(credentialStatus);
    credential.setIssuanceDate(credentialIssuanceDate);
    credential.setExpirationDate(credentialExpirationDate);

    console.log('Credential created:', credential);

    // Sign the credential to get the proof
    const signedCredential = await credential.sign(sampleKey);
    console.log('Credential signed, verifying...');

    // Verify the credential
    const verifyResult = await signedCredential.verify();
    if (verifyResult.verified) {
      console.log('Credential has been verified! Result:', verifyResult);
    } else {
      console.error('Credential could not be verified!');
    }
  } catch (e) {
    console.error('Error creating credential', e);
  }

  // Exit
  process.exit(0);
}

main();
