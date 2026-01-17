#!/bin/bash
# Render build script
# This ensures the build command runs correctly on Render

set -e  # Exit on error

echo "🔨 Starting build process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Generate Prisma client
echo "🗄️ Generating Prisma client..."
npm run prisma:generate

# Compile TypeScript
echo "🔧 Compiling TypeScript..."
npx tsc

# Resolve path aliases
echo "🔄 Resolving path aliases..."
npx tsc-alias

# Fix import extensions (.ts -> .js)
echo "🔀 Fixing import extensions..."
node scripts/fix-imports.js

echo "✅ Build completed successfully!"
