#!/bin/bash

# Quick start script for DataScience Table Tutor

set -e

echo "🎓 DataScience Table Tutor - Milestone 1"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo ""
    echo "Please install Node.js (v18 or higher) from:"
    echo "https://nodejs.org/"
    echo ""
    echo "Or use nvm:"
    echo "  nvm install 18"
    echo "  nvm use 18"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js found: $NODE_VERSION"

# Check for package manager
if command -v pnpm &> /dev/null; then
    PKG_MANAGER="pnpm"
    echo "✅ Using pnpm"
elif command -v yarn &> /dev/null; then
    PKG_MANAGER="yarn"
    echo "✅ Using yarn"
elif command -v npm &> /dev/null; then
    PKG_MANAGER="npm"
    echo "✅ Using npm"
else
    echo "❌ No package manager found!"
    echo "npm should come with Node.js. Please reinstall Node.js."
    exit 1
fi

echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    echo "   This may take a few minutes on first run..."
    echo ""
    $PKG_MANAGER install
    echo ""
    echo "✅ Dependencies installed!"
    echo ""
fi

# Start dev server
echo "🚀 Starting development server..."
echo ""
echo "The app will open at http://localhost:5173"
echo "Press Ctrl+C to stop the server"
echo ""
echo "========================================"
echo ""

if [ "$PKG_MANAGER" = "npm" ]; then
    npm run dev
else
    $PKG_MANAGER dev
fi

