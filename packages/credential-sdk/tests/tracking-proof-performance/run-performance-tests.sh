#!/bin/bash

# Performance Test Runner Script
# This script runs the proof performance tests with optimal settings

echo "=========================================="
echo "Proof Performance Test Runner"
echo "=========================================="
echo ""

# Check if node is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed or not in PATH"
    echo "Please install Node.js version 22.0.0 or higher"
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo "⚠️  Warning: Node.js version 22.0.0 or higher is recommended"
    echo "Current version: $(node -v)"
fi

# Navigate to the package directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."

echo "📁 Working directory: $(pwd)"
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    if command -v yarn &> /dev/null; then
        yarn install
    elif command -v npm &> /dev/null; then
        npm install
    else
        echo "❌ Error: Neither yarn nor npm is available"
        exit 1
    fi
    echo ""
fi

# Run the performance tests
echo "🚀 Running performance tests..."
echo "   - Garbage collection: ENABLED"
echo "   - Timeout: 120 seconds per test"
echo "   - Verbose output: ENABLED"
echo ""

# Run with garbage collection enabled for accurate memory measurements
node --expose-gc node_modules/.bin/jest tests/tracking-proof-performance/proof-performance.test.js \
    --verbose \
    --testTimeout=120000 \
    --maxWorkers=1 \
    --forceExit

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Performance tests completed successfully!"
    echo ""
    # Wait for performance results to be fully written to disk
    sleep 2
    echo "📊 Generating interactive dashboard..."
    node tests/tracking-proof-performance/generate-dashboard.js
else
    echo "❌ Performance tests failed with exit code: $EXIT_CODE"
fi

exit $EXIT_CODE
