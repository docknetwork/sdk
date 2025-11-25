# Proof Performance Testing

This directory contains performance tests for proof generation and verification in the credential SDK.

## Test File

- **`proof-performance.test.js`** - Comprehensive performance tests tracking execution time and memory usage

## What is Measured

### 1. **Execution Time**
- Time to generate proofs (credential issuance)
- Time to verify proofs (credential verification)
- Time for presentation signing and verification
- Batch operations performance

### 2. **Memory Usage**
The tests track four memory metrics:
- **RSS (Resident Set Size)**: Total memory allocated for the process
- **Heap Total**: Total size of the allocated heap
- **Heap Used**: Actual memory used on the heap
- **External**: Memory used by C++ objects bound to JavaScript

## Running the Tests

### Basic Test Run
```bash
# Run all tests
yarn test proof-performance.test.js

# Or using jest directly
npx jest tests/proof-performance.test.js --verbose
```

### With Garbage Collection (Recommended for accurate memory measurements)
```bash
# Enable garbage collection for more accurate memory tracking
node --expose-gc node_modules/.bin/jest tests/proof-performance.test.js --verbose
```

### Run for specific signature type
```bash
# The tests will automatically run for all signature types defined in test-keys
yarn test proof-performance.test.js
```

## Test Coverage

The performance tests cover:

1. **Credential Issuance** (Proof Generation)
   - JSON-LD format
   - JWT format
   - ProofValue format

2. **Credential Verification** (Proof Verification)
   - JSON-LD credentials
   - JWT credentials

3. **Presentation Operations**
   - Presentation signing
   - Presentation verification

4. **Batch Operations**
   - Batch issuance (10 credentials)
   - Batch verification (10 credentials)

## Signature Types Tested

The tests run against all signature types defined in `test-keys`:
- Ed25519Signature2018
- Ed25519Signature2020
- EcdsaSecp256k1Signature2019
- JsonWebSignature2020
- Bls12381BBSSignatureDock2022
- Bls12381PSSignatureDock2023
- And more...

## Understanding the Output

### Performance Report Format
```
================================================================================
Performance Report: Credential Issuance - Ed25519Signature2018
================================================================================
⏱️  Duration: 123.45 ms (0.123s)

📊 Memory Usage:
   Start:
     - RSS:        45.23 MB
     - Heap Total: 20.15 MB
     - Heap Used:  15.67 MB
     - External:   1.23 MB
   End:
     - RSS:        46.78 MB
     - Heap Total: 21.45 MB
     - Heap Used:  16.89 MB
     - External:   1.45 MB
   Delta (Change):
     - RSS:        1.55 MB
     - Heap Total: 1.30 MB
     - Heap Used:  1.22 MB
     - External:   0.22 MB
================================================================================
```

### Summary Report
At the end of all tests, a summary table shows:
- Test name
- Total duration
- Memory delta (heap used)

## Tips for Accurate Measurements

1. **Close other applications** to reduce system noise
2. **Run tests multiple times** and average the results
3. **Use `--expose-gc` flag** for accurate memory measurements
4. **Run in isolation** - don't run other tests simultaneously

## Customization

To add more performance tests, edit `proof-performance.test.js`:

```javascript
test("Your custom performance test", async () => {
  const tracker = new PerformanceTracker("Your Test Name");
  
  tracker.start();
  // Your code to measure
  tracker.stop();
  
  const results = tracker.printResults();
  performanceResults.push(results);
}, 60000);
```

## Troubleshooting

### Tests timeout
- Increase timeout in test definition: `test("...", async () => {...}, 120000)`
- Or configure Jest timeout in `jest.config.js`

### Memory measurements seem inaccurate
- Make sure to run with `--expose-gc` flag
- Close other applications
- Run tests multiple times

### Want to export results to file
Modify the `afterAll` hook in the test file to write results to JSON:

```javascript
afterAll(() => {
  const fs = require('fs');
  fs.writeFileSync(
    'performance-results.json',
    JSON.stringify(performanceResults, null, 2)
  );
});
```

## Performance Benchmarks

Expected performance ranges (will vary by system):

| Operation | Typical Duration | Memory Delta |
|-----------|-----------------|--------------|
| Credential Issuance | 50-200ms | 1-3 MB |
| Credential Verification | 30-150ms | 0.5-2 MB |
| JWT Issuance | 40-180ms | 1-3 MB |
| Presentation Signing | 60-250ms | 1-4 MB |
| Batch (10 creds) | 500-2000ms | 10-30 MB |

*Note: BBS+ and PS signatures may take longer due to cryptographic complexity*

## Contributing

When adding new signature types or proof methods:
1. Add the key to `test-keys.js`
2. The performance tests will automatically include it
3. Update this README with any specific notes
