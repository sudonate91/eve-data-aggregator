#!/bin/bash
# Build script for Unraid deployment
# Run this on your Unraid server after transferring the project files

set -e

echo "======================================"
echo "EVE Data Aggregator - Unraid Build"
echo "======================================"
echo ""

# Set variables
IMAGE_NAME="eve-data-aggregator"
IMAGE_TAG="latest"
APPDATA_PATH="/mnt/user/appdata/eve-data-aggregator"
TEMPLATE_DEST="/boot/config/plugins/dockerMan/templates-user/eve-data-aggregator.xml"

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Building Docker image..."
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} "$SCRIPT_DIR"

if [ $? -eq 0 ]; then
    echo "✓ Docker image built successfully: ${IMAGE_NAME}:${IMAGE_TAG}"
else
    echo "✗ Docker build failed"
    exit 1
fi

echo ""
echo "Checking for existing container..."
if docker ps -a | grep -q "${IMAGE_NAME}"; then
    echo "Found existing container. Removing..."
    docker stop ${IMAGE_NAME} 2>/dev/null || true
    docker rm ${IMAGE_NAME} 2>/dev/null || true
    echo "✓ Existing container removed"
fi

echo ""
echo "Installing Unraid template..."
if [ -f "$SCRIPT_DIR/unraid-template.xml" ]; then
    mkdir -p "$(dirname "$TEMPLATE_DEST")"
    cp "$SCRIPT_DIR/unraid-template.xml" "$TEMPLATE_DEST"
    echo "✓ Template installed to: $TEMPLATE_DEST"
    echo "  Refresh your Docker page in Unraid WebUI to see the template"
else
    echo "⚠ Template file not found: $SCRIPT_DIR/unraid-template.xml"
fi

echo ""
echo "======================================"
echo "Build Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Go to Unraid WebUI → Docker tab"
echo "2. Click 'Add Container'"
echo "3. Select 'eve-data-aggregator' from template dropdown"
echo "4. Fill in your configuration (EVE credentials, database settings)"
echo "5. Click 'Apply' to create the container"
echo ""
echo "Or run manually with docker-compose:"
echo "  cd $SCRIPT_DIR"
echo "  docker-compose up -d"
echo ""
echo "For detailed instructions, see UNRAID.md"
echo ""
