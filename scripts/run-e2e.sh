#!/bin/bash

# E2E Test Runner Script
# Usage: ./scripts/run-e2e.sh [options]
# Options:
#   --module <name>  Run specific module (project|keyword|interface|scenario|plan|report|ui-ux|validation)
#   --headed         Run in headed mode
#   --debug          Run with debug output

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
E2E_DIR="$PROJECT_ROOT/tests/e2e"

# Default options
HEADED=""
DEBUG=""
MODULE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --module)
      MODULE="$2"
      shift 2
      ;;
    --headed)
      HEADED="--headed"
      shift
      ;;
    --debug)
      DEBUG="--debug"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "========================================"
echo "Sisyphus-X E2E Acceptance Test"
echo "========================================"

# Check services
echo "Checking services..."

# Check backend
if ! curl -s http://localhost:8000/api/v1/dashboard/ > /dev/null 2>&1; then
  echo "Warning: Backend not running on port 8000"
fi

# Check frontend
if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
  echo "Warning: Frontend not running on port 5173"
fi

# Run tests
cd "$E2E_DIR"

if [ -n "$MODULE" ]; then
  echo "Running module: $MODULE"
  npx playwright test --project="$MODULE" $HEADED $DEBUG
else
  echo "Running all tests..."
  npx playwright test $HEADED $DEBUG
fi

echo "========================================"
echo "Test completed!"
echo "Report: $PROJECT_ROOT/playwright-report/index.html"
echo "========================================"
