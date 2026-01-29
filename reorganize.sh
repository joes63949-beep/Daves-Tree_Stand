#!/bin/bash

echo "🔧 Reorganizing project structure for deployment..."

# Check if we're in the right directory
if [ ! -d "daves-tree-stand" ]; then
    echo "❌ Error: daves-tree-stand directory not found"
    echo "Make sure you're in /Users/josephsmith/Desktop/Daves-Tree_Stand"
    exit 1
fi

# Move files from subdirectory to root
echo "📦 Moving application files to root..."
mv daves-tree-stand/package.json . 2>/dev/null || echo "package.json already at root"
mv daves-tree-stand/server.js . 2>/dev/null || echo "server.js already at root"
mv daves-tree-stand/.env . 2>/dev/null || echo ".env already at root or doesn't exist"
mv daves-tree-stand/public . 2>/dev/null || echo "public already at root"

# Remove old structure
echo "🧹 Cleaning up old structure..."
rm -rf daves-tree-stand
rm -f package-lock.json

# Reinstall dependencies
echo "📥 Reinstalling dependencies..."
npm install

# Git operations
echo "📤 Committing changes..."
git add .
git commit -m "refactor: flatten directory structure for deployment"

echo "✅ Reorganization complete!"
echo ""
echo "Next steps:"
echo "1. Push to GitHub: git push"
echo "2. Deploy to Azure: az webapp up --name daves-tree-stand-ny --runtime \"NODE:18-lts\" --sku B1 --location eastus"
