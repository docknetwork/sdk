# 🚀 Proof Performance Testing Suite

Comprehensive performance test suite to measure the performance of proof creation and verification in the credential SDK.

## 📁 Contents

### Test Files
- **`proof-performance.test.js`** - Performance tests with console output and JSON export

### Tools
- **`run-performance-tests.sh`** - Script to run tests (executable)
- **`generate-dashboard.js`** - Interactive dashboard generator

### Documentation
- **`PERFORMANCE_TESTING.md`** - Technical details (English)

## 🚀 Quick Start

### Method 1: Using Script (Recommended)
```bash
# From credential-sdk directory
./tests/tracking-proof-performance/run-performance-tests.sh

# Or from this directory
./run-performance-tests.sh
```

**After completion, an HTML dashboard will automatically open in your browser! 🎨**

### Method 2: Using Yarn Commands

#### Run Complete Performance Test Suite
```bash
yarn test:perf
```
- Runs all performance tests with optimal settings
- Automatically generates and opens interactive dashboard
- Exports results to JSON
- **Recommended for most users**

#### Run Tests with Console Output Only
```bash
yarn test:perf:console
```
- Runs tests with detailed console output
- Includes garbage collection for accurate memory measurement
- No automatic dashboard generation
- Useful for quick checks or CI/CD

#### Generate Dashboard from Existing Results
```bash
yarn perf:dashboard
```
- Generates dashboard from the most recent test results
- Opens dashboard in browser automatically
- Use this if you want to view results again without re-running tests

#### Quick Reference

| Command | Description | Dashboard | JSON Export |
|---------|-------------|-----------|-------------|
| `yarn test:perf` | Full test suite with dashboard | ✅ Auto-open | ✅ Yes |
| `yarn test:perf:console` | Console output only | ❌ No | ✅ Yes |
| `yarn perf:dashboard` | Generate dashboard only | ✅ Auto-open | Uses existing |

### Method 3: Run Directly with Jest
```bash
# With yarn
yarn test proof-performance.test.js

# With npm
npm test -- proof-performance.test.js

# With node and jest directly
node --expose-gc node_modules/.bin/jest tests/tracking-proof-performance/proof-performance.test.js --verbose
```

### Method 3: Run with Garbage Collection (More Accurate)
```bash
node --expose-gc node_modules/.bin/jest tests/tracking-proof-performance/proof-performance.test.js \
    --verbose \
    --testTimeout=120000 \
    --maxWorkers=1
```

## 🎯 Metrics Measured

### ⏱️ Time Metrics
- Generate proof time (credential issuance)
- Verify proof time (credential verification)
- Presentation signing/verification time
- Batch operations time

### 💾 Memory Metrics
- RSS (Resident Set Size)
- Heap Total
- Heap Used
- External Memory

Each metric has: **Start**, **End**, **Delta** (change)

## 📊 Test Coverage

✅ 9 test cases × N signature types

**Test Cases:**
1. Credential Issuance (JSON-LD)
2. Credential Verification
3. ProofValue Format Issuance
4. JWT Issuance
5. JWT Verification
6. Presentation Signing
7. Presentation Verification
8. Batch Issuance (10 credentials)
9. Batch Verification (10 credentials)

**Signature Types:**
- Ed25519Signature2018/2020
- EcdsaSecp256k1Signature2019
- JsonWebSignature2020
- Bls12381BBS/PS Signatures (2022/2023)
- BBDT16MAC Proof (2024)

## 🎨 Interactive Dashboard

Dashboard displays:
- 📊 **Charts** - Performance comparison between test types
- 📈 **Summary Cards** - Overview of important metrics
- 📋 **Detailed Table** - All test results with performance badges
- 🎯 **Performance Badges** - Fast/Medium/Slow indicators

Dashboard is saved at: `performance-results/dashboard.html`

### Dashboard Features

**Summary Cards:**
- Total Duration - Total time to run all tests
- Average Duration - Average time per test
- Total Memory Delta - Total memory used
- Average Memory - Average memory per test

**Interactive Charts:**
- Duration Chart - Compare duration between test types
- Memory Chart - Compare memory usage between test types

**Performance Badges:**
- **Fast** (Green) - Duration < 100ms
- **Medium** (Yellow) - Duration 100-200ms
- **Slow** (Red) - Duration > 200ms

### Opening Dashboard

Dashboard automatically opens after tests complete. To open manually:

```bash
# Regenerate from latest results
node tests/tracking-proof-performance/generate-dashboard.js

# Or open HTML file directly
open performance-results/dashboard.html  # macOS
xdg-open performance-results/dashboard.html  # Linux
start performance-results/dashboard.html  # Windows
```

## 📈 Expected Performance Ranges

(Results may vary by system)

| Operation | Duration | Memory Delta |
|-----------|----------|--------------|
| Credential Issuance (Ed25519) | 50-150ms | 1-2 MB |
| Credential Verification (Ed25519) | 30-100ms | 0.5-1.5 MB |
| JWT Issuance | 40-140ms | 1-2 MB |
| Presentation Signing | 60-200ms | 1-3 MB |
| Batch 10 Credentials | 500-1500ms | 10-25 MB |
| BBS+ Signatures | 200-500ms | 3-8 MB |
| PS Signatures | 180-450ms | 3-7 MB |

*Note: BBS+ and PS signatures are typically slower due to higher cryptographic complexity*

## 📝 Output Examples

### Console Output
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

### JSON Export
Results are automatically saved to:
```
performance-results/performance-YYYY-MM-DDTHH-MM-SS.json
```

JSON structure:
```json
{
  "metadata": {
    "testDate": "2025-11-25T10:00:00.000Z",
    "nodeVersion": "v22.0.0",
    "platform": "darwin",
    "arch": "arm64",
    "totalTests": 72
  },
  "results": [
    {
      "name": "Credential Issuance - Ed25519Signature2018",
      "timestamp": "2025-11-25T10:00:01.000Z",
      "duration": {
        "ms": 123.45,
        "seconds": 0.123
      },
      "memory": {
        "start": { "rss": 47456256, "heapTotal": 21135360, ... },
        "end": { "rss": 49123456, "heapTotal": 22456789, ... },
        "delta": { "rss": 1667200, "heapTotal": 1321429, ... }
      }
    }
  ],
  "summary": {
    "totalDuration": 8901.23,
    "averageDuration": 123.63,
    "totalMemoryDelta": 104857600,
    "averageMemoryDelta": 1456355
  }
}
```

## 🔧 Customization

### Adding New Test Cases
Edit `proof-performance.test.js`:

```javascript
test("Your custom performance test", async () => {
  const tracker = new PerformanceTracker("Your Test Name");
  
  tracker.start();
  // Code to measure performance
  await yourOperation();
  tracker.stop();
  
  const results = tracker.printResults();
  performanceResults.push(results);
  
  expect(result).toBeDefined();
}, 60000); // 60s timeout
```

### Changing Batch Test Credential Count
Find and modify:
```javascript
Array.from({ length: 10 }, () => ...) // Change 10 to another number
```

### Customizing Dashboard
Edit `generate-dashboard.js` to modify:
- Colors and styling (CSS)
- Chart types and configurations
- Table columns
- Performance thresholds

## 📝 Tips for Accurate Measurement

1. **Close other applications** to reduce system noise
2. **Run multiple times** and take average
3. **Use `--expose-gc`** for accurate memory measurement
4. **Run in isolation** - don't run with other tests
5. **Check CPU/RAM** - ensure system is not overloaded

## 🐛 Troubleshooting

### Tests Timeout
```bash
# Increase timeout in test definition
test("...", async () => {...}, 120000) // 120 seconds

# Or add flag when running
jest --testTimeout=180000
```

### Inaccurate Memory Measurements
```bash
# Run with garbage collection
node --expose-gc node_modules/.bin/jest ...

# Close other applications
# Run multiple times and take average
```

### Node.js Not Found
```bash
# Check if Node.js is installed
node --version

# If not installed, install Node.js >= 22.0.0
# https://nodejs.org/
```

### Dependencies Not Installed
```bash
# Install dependencies
yarn install
# or
npm install
```

### Dashboard Doesn't Open Automatically
```bash
# Open manually
open performance-results/dashboard.html
```

### Cannot Find dashboard.html
```bash
# Regenerate dashboard
node tests/tracking-proof-performance/generate-dashboard.js
```

### Error "No performance results found"
```bash
# Run tests first
./tests/tracking-proof-performance/run-performance-tests.sh
```

## 📊 Analyzing Results

### Compare Signature Types
Use JSON export to compare performance between signature types:
- Ed25519: Fastest, least memory usage
- ECDSA: Comparable to Ed25519
- BBS+: Slower but supports selective disclosure
- PS: Similar to BBS+

### Identify Bottlenecks
- If **Duration is high**: Optimize algorithm or use faster signature type
- If **Memory delta is high**: Check for memory leaks, optimize data structures

### Benchmark Comparison
Compare results before and after code optimization:
```bash
# Run before optimization
./tests/tracking-proof-performance/run-performance-tests.sh > before.txt

# After optimization
./tests/tracking-proof-performance/run-performance-tests.sh > after.txt

# Compare
diff before.txt after.txt
```

## 🔧 Requirements

- Node.js >= 22.0.0
- Dependencies installed (`yarn install`)
- Optional: `--expose-gc` flag for accurate memory tracking

## 🤝 Contributing

When adding new signature types:
1. Add key to `test-keys.js`
2. Tests will automatically run for new signature type
3. Update README with expected performance ranges

## 📚 References

- [PERFORMANCE_TESTING.md](./PERFORMANCE_TESTING.md) - Technical details
- [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model/)
- [JSON-LD Signatures](https://w3c-ccg.github.io/ld-signatures/)

---

**Tip:** Dashboard uses Chart.js from CDN, requires internet to display charts! 📶
