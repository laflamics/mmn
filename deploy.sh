#!/bin/bash

# Deployment script untuk noxtiz.com/mmn
# Usage: ./deploy.sh

set -e

echo "🚀 Starting deployment process..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check Node.js
echo -e "${BLUE}[1/5]${NC} Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js v18+"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"
echo ""

# Step 2: Install dependencies
echo -e "${BLUE}[2/5]${NC} Installing dependencies..."
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 3: Build
echo -e "${BLUE}[3/5]${NC} Building application..."
npm run build
echo -e "${GREEN}✓ Build completed${NC}"
echo ""

# Step 4: Check build output
echo -e "${BLUE}[4/5]${NC} Verifying build output..."
if [ -d "dist" ]; then
    SIZE=$(du -sh dist | cut -f1)
    FILES=$(find dist -type f | wc -l)
    echo -e "${GREEN}✓ Build size: $SIZE ($FILES files)${NC}"
else
    echo "❌ Build folder not found"
    exit 1
fi
echo ""

# Step 5: Create deployment package
echo -e "${BLUE}[5/5]${NC} Creating deployment package..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PACKAGE_NAME="mmn_deploy_${TIMESTAMP}.tar.gz"

tar -czf "$PACKAGE_NAME" dist/
echo -e "${GREEN}✓ Deployment package created: $PACKAGE_NAME${NC}"
echo ""

# Summary
echo -e "${GREEN}✅ Deployment preparation completed!${NC}"
echo ""
echo "📦 Next steps:"
echo "1. Upload 'dist/' folder to noxtiz.com/mmn/"
echo "2. Or upload '$PACKAGE_NAME' and extract on server"
echo ""
echo "📝 For detailed instructions, see DEPLOYMENT.md"
echo ""
echo "🌐 Access your app at: https://noxtiz.com/mmn"
