# 🎨 Performance Dashboard Guide

## Tự động mở Dashboard

Khi chạy script `run-performance-tests.sh`, dashboard sẽ **tự động mở** trong browser sau khi tests hoàn thành.

```bash
./tests/tracking-proof-performance/run-performance-tests.sh
```

## Mở Dashboard thủ công

Nếu bạn muốn xem lại dashboard:

### Cách 1: Generate lại từ kết quả mới nhất
```bash
node tests/tracking-proof-performance/generate-dashboard.js
```

### Cách 2: Mở file HTML trực tiếp
```bash
# macOS
open performance-results/dashboard.html

# Linux
xdg-open performance-results/dashboard.html

# Windows
start performance-results/dashboard.html
```

## Dashboard Features

### 📊 Summary Cards
Hiển thị 4 metrics chính:
- **Total Duration** - Tổng thời gian chạy tất cả tests
- **Average Duration** - Thời gian trung bình mỗi test
- **Total Memory Delta** - Tổng bộ nhớ sử dụng
- **Average Memory** - Bộ nhớ trung bình mỗi test

### 📈 Interactive Charts
- **Duration Chart** - So sánh thời gian giữa các test types
- **Memory Chart** - So sánh memory usage giữa các test types

### 📋 Detailed Results Table
Bảng chi tiết với:
- Test name
- Duration (ms)
- Memory delta (MB)
- Performance badge (Fast/Medium/Slow)

### 🎯 Performance Badges
- **Fast** (Green) - Duration < 100ms
- **Medium** (Yellow) - Duration 100-200ms
- **Slow** (Red) - Duration > 200ms

## Metadata

Dashboard cũng hiển thị:
- Test date & time
- Node.js version
- Platform & architecture
- Total number of tests

## File Location

Dashboard được lưu tại:
```
performance-results/dashboard.html
```

File này được tự động generate và **không được commit** vào git (đã có trong `.gitignore`).

## Troubleshooting

### Dashboard không mở tự động
Mở thủ công bằng lệnh:
```bash
open performance-results/dashboard.html
```

### Không tìm thấy file dashboard.html
Chạy lại generate script:
```bash
node tests/tracking-proof-performance/generate-dashboard.js
```

### Lỗi "No performance results found"
Chạy tests trước:
```bash
./tests/tracking-proof-performance/run-performance-tests.sh
```

## Customization

Để customize dashboard, edit file:
```
tests/tracking-proof-performance/generate-dashboard.js
```

Bạn có thể thay đổi:
- Colors và styling (CSS)
- Chart types và configurations
- Table columns
- Performance thresholds

---

**Tip:** Dashboard sử dụng Chart.js từ CDN, cần internet để hiển thị charts! 📶
