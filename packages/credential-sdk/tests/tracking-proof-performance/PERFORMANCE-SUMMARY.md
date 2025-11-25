# Performance Testing Suite - Quick Summary

## ✅ Đã tạo thành công

### 📁 Test Files
1. **proof-performance.test.js** - Test với console output
2. **proof-performance-export.test.js** - Test với JSON export

### 📚 Documentation  
3. **README-PERFORMANCE.md** - Hướng dẫn đầy đủ (tiếng Việt)
4. **PERFORMANCE_TESTING.md** - Chi tiết kỹ thuật (tiếng Anh)

### 🛠️ Tools
5. **run-performance-tests.sh** - Script chạy tests (executable)
6. **.gitignore** - Loại trừ kết quả khỏi git

## 🎯 Thông số đo được

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

Mỗi metric có: **Start**, **End**, **Delta** (change)

## 🚀 Quick Start

### Cách 1: Dùng script (Khuyến nghị)
```bash
cd /Users/minhnt/1Matrix/did-vc-sdk/packages/credential-sdk
./tests/run-performance-tests.sh
```

### Cách 2: Console output only
```bash
yarn test proof-performance.test.js
```

### Cách 3: Export to JSON
```bash
node --expose-gc node_modules/.bin/jest tests/proof-performance-export.test.js --verbose
```
Kết quả lưu tại: `performance-results/performance-*.json`

## 📊 Test Coverage

✅ 9 test cases × N signature types = ~72 tests total

**Test Cases:**
1. Credential Issuance (JSON-LD)
2. Credential Verification
3. ProofValue Format Issuance
4. JWT Issuance
5. JWT Verification
6. Presentation Signing
7. Presentation Verification
8. Batch Issuance (10 creds)
9. Batch Verification (10 creds)

**Signature Types:**
- Ed25519Signature2018/2020
- EcdsaSecp256k1Signature2019
- JsonWebSignature2020
- Bls12381BBS/PS Signatures (2022/2023)
- BBDT16MAC Proof (2024)

## 📈 Expected Results

| Operation | Time | Memory |
|-----------|------|--------|
| Ed25519 Issuance | 50-150ms | 1-2 MB |
| Ed25519 Verify | 30-100ms | 0.5-1.5 MB |
| BBS+ Issuance | 200-500ms | 3-8 MB |
| Batch 10 creds | 500-1500ms | 10-25 MB |

## 📝 Output Examples

### Console Output
```
================================================================================
Performance Report: Credential Issuance - Ed25519Signature2018
================================================================================
⏱️  Duration: 123.45 ms (0.123s)

📊 Memory Usage:
   Delta (Change):
     - RSS:        1.55 MB
     - Heap Used:  1.22 MB
================================================================================
```

### JSON Export
```json
{
  "metadata": {
    "testDate": "2025-11-25T10:00:00.000Z",
    "nodeVersion": "v22.0.0",
    "totalTests": 72
  },
  "summary": {
    "totalDuration": 8901.23,
    "averageDuration": 123.63,
    "averageMemoryDelta": 1456355
  }
}
```

## 🔧 Requirements

- Node.js >= 22.0.0
- Dependencies installed (`yarn install`)
- Optional: `--expose-gc` flag for accurate memory tracking

## 📖 Đọc thêm

- **README-PERFORMANCE.md** - Hướng dẫn chi tiết tiếng Việt
- **PERFORMANCE_TESTING.md** - Technical details in English

## ✨ Features

✅ Automatic testing across all signature types  
✅ Detailed time and memory tracking  
✅ JSON export for analysis  
✅ Summary reports  
✅ Batch operation testing  
✅ Multiple credential formats (JSON-LD, JWT, proofValue)

---

**Created:** 2025-11-25  
**Location:** `/Users/minhnt/1Matrix/did-vc-sdk/packages/credential-sdk/tests/`
