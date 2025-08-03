#!/bin/bash

# Render.com Build Script
# This script ensures proper dependency installation

echo "🚀 Starting build process..."

# Clean any existing node_modules and package-lock.json
echo "🧹 Cleaning previous installations..."
rm -rf node_modules
rm -f package-lock.json

# Install dependencies with specific npm version
echo "📦 Installing dependencies..."
npm install --verbose --no-audit --no-fund

# Verify critical dependencies
echo "🔍 Verifying critical dependencies..."
npm list express debug socket.io mongoose

# Show installed packages for debugging
echo "📋 Installed packages:"
npm list --depth=0

echo "✅ Build completed successfully!"
