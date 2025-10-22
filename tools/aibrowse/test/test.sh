#!/bin/bash

# Simple test script for aibrowse
# Tests basic functionality with a local HTML file

echo "=== Testing aibrowse ==="
echo ""

# Get the absolute path to the test file
TEST_FILE="file://$(pwd)/test/simple-page.html"

echo "1. Opening test page..."
node bin/aibrowse.js open "$TEST_FILE"
echo ""

echo "2. Discovering Minimact components..."
node bin/aibrowse.js minimact components
echo ""

echo "3. Querying for buttons..."
node bin/aibrowse.js query "button"
echo ""

echo "4. Querying for interactive elements..."
node bin/aibrowse.js query "button" --interactive --limit 2
echo ""

echo "5. Checking console logs..."
node bin/aibrowse.js console
echo ""

echo "6. Clicking the increment button (E0)..."
node bin/aibrowse.js click E0
echo ""

echo "7. Checking console logs after click..."
node bin/aibrowse.js console --since-last
echo ""

echo "8. Checking for errors..."
node bin/aibrowse.js errors
echo ""

echo "9. Taking a screenshot..."
node bin/aibrowse.js screenshot test/screenshot.png
echo ""

echo "10. Closing browser..."
node bin/aibrowse.js close
echo ""

echo "=== Test complete ==="
