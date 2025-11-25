# 🚀 Proof Performance Testing Suite

Bộ test performance toàn diện để đo lường hiệu suất của việc tạo và verify proof trong credential SDK.

## 📁 Files được tạo

### Test Files
1. **`proof-performance.test.js`** - Test performance cơ bản với console output
2. **`proof-performance-export.test.js`** - Test performance với export kết quả ra JSON

### Documentation
3. **`PERFORMANCE_TESTING.md`** - Hướng dẫn chi tiết về performance testing
4. **`run-performance-tests.sh`** - Script bash để chạy tests với cấu hình tối ưu

### Configuration
5. **`.gitignore`** - Loại trừ kết quả performance khỏi git

## 🎯 Các thông số được đo

### 1. ⏱️ Execution Time (Thời gian thực thi)
- **Generate Proof Time**: Thời gian tạo proof khi issue credential
- **Verify Proof Time**: Thời gian verify proof
- **Presentation Operations**: Thời gian sign và verify presentations
- **Batch Operations**: Hiệu suất khi xử lý nhiều credentials

### 2. 💾 Memory Usage (Sử dụng RAM)
Theo dõi 4 metrics bộ nhớ:

- **RSS (Resident Set Size)**: Tổng bộ nhớ được cấp phát cho process
- **Heap Total**: Tổng kích thước heap được cấp phát
- **Heap Used**: Bộ nhớ thực tế đang sử dụng trên heap
- **External**: Bộ nhớ được sử dụng bởi C++ objects

Mỗi metric được đo ở 3 thời điểm:
- **Start**: Trước khi chạy operation
- **End**: Sau khi hoàn thành operation
- **Delta**: Sự thay đổi (End - Start)

## 🏃 Cách chạy tests

### Option 1: Sử dụng script (Khuyến nghị)
```bash
# Chạy từ thư mục tests
./run-performance-tests.sh

# Hoặc từ thư mục credential-sdk
./tests/run-performance-tests.sh
```

### Option 2: Chạy trực tiếp với Jest

#### Test cơ bản (console output)
```bash
# Với yarn
yarn test proof-performance.test.js

# Với npm
npm test -- proof-performance.test.js

# Với node và jest trực tiếp
node --expose-gc node_modules/.bin/jest tests/proof-performance.test.js --verbose
```

#### Test với JSON export
```bash
# Kết quả sẽ được lưu vào thư mục performance-results/
node --expose-gc node_modules/.bin/jest tests/proof-performance-export.test.js --verbose
```

### Option 3: Chạy với garbage collection (Đo bộ nhớ chính xác hơn)
```bash
node --expose-gc node_modules/.bin/jest tests/proof-performance.test.js \
    --verbose \
    --testTimeout=120000 \
    --maxWorkers=1
```

## 📊 Các test cases

### Credential Operations
1. ✅ **Credential Issuance** - Tạo credential với proof (JSON-LD)
2. ✅ **Credential Verification** - Verify credential proof
3. ✅ **ProofValue Format** - Tạo credential với proofValue format
4. ✅ **JWT Issuance** - Tạo JWT credential
5. ✅ **JWT Verification** - Verify JWT credential

### Presentation Operations
6. ✅ **Presentation Signing** - Sign presentation
7. ✅ **Presentation Verification** - Verify presentation

### Batch Operations
8. ✅ **Batch Issuance** - Tạo 10 credentials cùng lúc
9. ✅ **Batch Verification** - Verify 10 credentials cùng lúc

### Signature Types Tested
Tất cả tests chạy với các signature types:
- Ed25519Signature2018
- Ed25519Signature2020
- EcdsaSecp256k1Signature2019
- JsonWebSignature2020
- Bls12381BBSSignatureDock2022
- Bls12381BBSSignatureProofDock2022
- Bls12381BBSSignatureDock2023
- Bls12381BBSSignatureProofDock2023
- Bls12381PSSignatureDock2023
- Bls12381PSSignatureProofDock2023
- Bls12381BBDT16MACProofDock2024

## 📈 Hiểu kết quả

### Console Output Format
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

### JSON Export Format
Khi chạy `proof-performance-export.test.js`, kết quả được lưu vào:
```
performance-results/performance-YYYY-MM-DDTHH-MM-SS.json
```

Cấu trúc JSON:
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

## 🎨 Ví dụ kết quả

### Expected Performance Ranges
(Kết quả có thể khác nhau tùy hệ thống)

| Operation | Duration | Memory Delta |
|-----------|----------|--------------|
| Credential Issuance (Ed25519) | 50-150ms | 1-2 MB |
| Credential Verification (Ed25519) | 30-100ms | 0.5-1.5 MB |
| JWT Issuance | 40-140ms | 1-2 MB |
| Presentation Signing | 60-200ms | 1-3 MB |
| Batch 10 Credentials | 500-1500ms | 10-25 MB |
| BBS+ Signatures | 200-500ms | 3-8 MB |
| PS Signatures | 180-450ms | 3-7 MB |

*Note: BBS+ và PS signatures thường chậm hơn do độ phức tạp mật mã cao hơn*

## 🔧 Customization

### Thêm test case mới
Edit file `proof-performance.test.js` hoặc `proof-performance-export.test.js`:

```javascript
test("Your custom performance test", async () => {
  const tracker = new PerformanceTracker("Your Test Name");
  
  tracker.start();
  // Code cần đo performance
  await yourOperation();
  tracker.stop();
  
  const results = tracker.printResults();
  performanceResults.push(results);
  
  // Assertions
  expect(result).toBeDefined();
}, 60000); // timeout 60s
```

### Thay đổi số lượng credentials trong batch test
Tìm và sửa:
```javascript
Array.from({ length: 10 }, () => ...) // Đổi 10 thành số khác
```

### Export sang format khác
Sửa phần `afterAll` hook để export sang CSV, Excel, etc.

## 📝 Tips để đo chính xác

1. **Đóng các ứng dụng khác** để giảm nhiễu hệ thống
2. **Chạy nhiều lần** và lấy trung bình
3. **Sử dụng `--expose-gc`** để đo bộ nhớ chính xác
4. **Chạy riêng lẻ** - không chạy cùng tests khác
5. **Kiểm tra CPU/RAM** - đảm bảo hệ thống không quá tải

## 🐛 Troubleshooting

### Tests bị timeout
```bash
# Tăng timeout trong test definition
test("...", async () => {...}, 120000) // 120 seconds

# Hoặc thêm flag khi chạy
jest --testTimeout=180000
```

### Memory measurements không chính xác
```bash
# Chạy với garbage collection
node --expose-gc node_modules/.bin/jest ...

# Đóng các ứng dụng khác
# Chạy nhiều lần và lấy trung bình
```

### Node.js không tìm thấy
```bash
# Kiểm tra Node.js đã cài đặt
node --version

# Nếu chưa có, cài đặt Node.js >= 22.0.0
# https://nodejs.org/
```

### Dependencies chưa cài
```bash
# Cài dependencies
yarn install
# hoặc
npm install
```

## 📊 Phân tích kết quả

### So sánh signature types
Dùng JSON export để so sánh hiệu suất giữa các signature types:
- Ed25519: Nhanh nhất, ít tốn bộ nhớ nhất
- ECDSA: Tương đương Ed25519
- BBS+: Chậm hơn nhưng hỗ trợ selective disclosure
- PS: Tương tự BBS+

### Identify bottlenecks
- Nếu **Duration cao**: Tối ưu thuật toán hoặc sử dụng signature type nhanh hơn
- Nếu **Memory delta cao**: Kiểm tra memory leaks, tối ưu data structures

### Benchmark comparison
So sánh kết quả trước và sau khi optimize code:
```bash
# Chạy trước optimization
./tests/run-performance-tests.sh > before.txt

# Sau khi optimize
./tests/run-performance-tests.sh > after.txt

# So sánh
diff before.txt after.txt
```

## 🤝 Contributing

Khi thêm signature type mới:
1. Thêm key vào `test-keys.js`
2. Tests sẽ tự động chạy cho signature type mới
3. Update README với expected performance ranges

## 📚 Tài liệu tham khảo

- [PERFORMANCE_TESTING.md](./PERFORMANCE_TESTING.md) - Chi tiết về performance testing
- [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model/)
- [JSON-LD Signatures](https://w3c-ccg.github.io/ld-signatures/)

## ❓ Questions?

Nếu có câu hỏi hoặc vấn đề, vui lòng:
1. Kiểm tra [PERFORMANCE_TESTING.md](./PERFORMANCE_TESTING.md)
2. Xem phần Troubleshooting ở trên
3. Tạo issue trên GitHub repository

---

**Happy Testing! 🎉**
