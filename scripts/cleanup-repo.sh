#!/bin/bash
# Repository cleanup and organization script

set -e

cd "$(dirname "$0")/.."

echo "🧹 Starting repository cleanup and organization..."

# Remove OS files
echo "Removing OS files..."
find . -name ".DS_Store" -type f -delete
find . -name "._*" -type f -delete

# Remove compiled binaries
echo "Removing compiled binaries..."
rm -f backend/main
rm -f backend/main-simple
rm -rf backend/bin/

# Remove local config files (keep examples)
echo "Removing local config files..."
rm -f backend/configs/config.yaml
rm -f backend/configs/config.yaml.local
rm -f backend/configs/config.production.yaml 2>/dev/null || true

# Remove build artifacts
echo "Removing build artifacts..."
rm -rf website/dist/
rm -rf frontend/.next/
rm -rf frontend/out/
rm -rf frontend/test-results/
rm -rf frontend/playwright-report/
rm -rf frontend/.playwright-mcp/

# Remove test artifacts
echo "Removing test artifacts..."
rm -rf test-results/
rm -rf playwright-report/
rm -rf coverage/
rm -rf .nyc_output/

# Remove duplicate env files (keep .env.example)
echo "Cleaning up env files..."
if [ -f "env.example" ] && [ -f ".env.example" ]; then
  # Keep .env.example (more standard)
  rm -f env.example
fi

# Move outdated files to archive
echo "Archiving outdated files..."
mkdir -p archive/old-files

# Move old scripts if they exist
[ -f "setup.sh" ] && mv setup.sh archive/old-files/ 2>/dev/null || true
[ -f "PRODUCTION_CHECKLIST.md" ] && mv PRODUCTION_CHECKLIST.md archive/old-files/ 2>/dev/null || true

# Remove demo code (move to archive)
if [ -d "backend/auth-demo" ]; then
  mv backend/auth-demo archive/old-files/backend-auth-demo 2>/dev/null || true
fi
if [ -d "backend/cmd/auth-demo" ]; then
  mv backend/cmd/auth-demo archive/old-files/backend-cmd-auth-demo 2>/dev/null || true
fi

# Clean up .kiro directory (if not needed)
if [ -d ".kiro" ]; then
  echo "Note: .kiro directory exists. Review if needed."
fi

echo "✅ Cleanup complete!"

