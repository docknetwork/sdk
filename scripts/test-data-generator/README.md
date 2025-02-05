Example

```bash
CHEQD_MNEMONIC="steak come surprise obvious remain black trouble measure design volume retreat float coach amused match album moment radio stuff crack orphan ranch dose endorse" CHEQD_IMAGE_TAG="3.1.5" CHEQD_NETWORK="testnet" CHEQD_ENDPOINT=http://localhost:26657 DOCK_ENDPOINT=ws://localhost:9944 ../with_cheqd_docker_test_node ../with_dock_docker_test_node npx babel-node src/main.js
```

Env

```bash
DOCK_ENDPOINT
CHEQD_ENDPOINT
CHEQD_NETWORK
CHEQD_MNEMONIC
DOCK_ACCOUNT_URI
DID # - dock DID to be used as the owner of the DID Document and all entities/DLRs
ACCUMULATOR_ID
STATUS_LIST_CREDENTIAL_ID
```
