# 🎯 Proof Performance Tracking

Thư mục này chứa bộ test toàn diện để tracking performance của việc tạo và verify proof trong credential SDK.

## 📁 Nội dung

### Test Files
- **`proof-performance.test.js`** - Test với console output chi tiết
- **`proof-performance-export.test.js`** - Test với JSON export

### Documentation
- **`README-PERFORMANCE.md`** - Hướng dẫn đầy đủ (tiếng Việt)
- **`PERFORMANCE_TESTING.md`** - Chi tiết kỹ thuật (tiếng Anh)
- **`PERFORMANCE-SUMMARY.md`** - Tổng quan nhanh

### Tools
- **`run-performance-tests.sh`** - Script chạy tests (executable)

## 🚀 Quick Start

```bash
# Từ thư mục credential-sdk
./tests/tracking-proof-performance/run-performance-tests.sh

# Hoặc từ thư mục này
./run-performance-tests.sh
```

**Sau khi chạy xong, một dashboard HTML sẽ tự động mở trong browser! 🎨**

## 🎨 Interactive Dashboard

Dashboard hiển thị:
- 📊 **Charts** - Biểu đồ so sánh performance giữa các test types
- 📈 **Summary Cards** - Tổng quan metrics quan trọng
- 📋 **Detailed Table** - Bảng chi tiết tất cả test results
- 🎯 **Performance Badges** - Fast/Medium/Slow indicators

Dashboard được lưu tại: `performance-results/dashboard.html`

## 📊 Thông số đo được

### ⏱️ Time Metrics
- Generate proof time
- Verify proof time
- Presentation operations time
- Batch operations time

### 💾 Memory Metrics
- RSS (Resident Set Size)
- Heap Total
- Heap Used
- External Memory

## 📖 Đọc thêm

- **[README-PERFORMANCE.md](./README-PERFORMANCE.md)** - Hướng dẫn chi tiết
- **[PERFORMANCE-SUMMARY.md](./PERFORMANCE-SUMMARY.md)** - Tổng quan nhanh
- **[PERFORMANCE_TESTING.md](./PERFORMANCE_TESTING.md)** - Technical details

## 🎯 Test Coverage

✅ 9 test cases × N signature types  
✅ Credential Issuance (JSON-LD, JWT, ProofValue)  
✅ Credential Verification  
✅ Presentation Signing & Verification  
✅ Batch Operations (10 credentials)

## 📝 Example Usage

### Console Output Only
```bash
yarn test tracking-proof-performance/proof-performance.test.js
```

### With JSON Export
```bash
node --expose-gc node_modules/.bin/jest tests/tracking-proof-performance/proof-performance-export.test.js --verbose
```

Kết quả lưu tại: `performance-results/performance-*.json`

---

**Created:** 2025-11-25  
**Location:** `/Users/minhnt/1Matrix/did-vc-sdk/packages/credential-sdk/tests/tracking-proof-performance/`
