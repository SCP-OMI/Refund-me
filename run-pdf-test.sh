#!/bin/bash
set -e

CONTAINER_NAME="refund-med-app"

echo "Copying test script to container..."
# Copy to /tmp to avoid permission issues in /app
docker cp scripts/test-bon-de-caisse-gen.ts $CONTAINER_NAME:/tmp/

echo "Copying template to container..."
docker cp src/templates/bon-de-caisse.html $CONTAINER_NAME:/app/src/templates/

echo "Running test script in container..."
# Run from /app to resolve modules correctly, but script reads/writes using appropriate paths
docker exec -e NODE_PATH=/app/node_modules $CONTAINER_NAME npx tsx /tmp/test-bon-de-caisse-gen.ts

echo "Copying generated PDF back to host..."
docker cp $CONTAINER_NAME:/tmp/test-bon-de-caisse.pdf .

echo "Done! Check test-bon-de-caisse.pdf"
