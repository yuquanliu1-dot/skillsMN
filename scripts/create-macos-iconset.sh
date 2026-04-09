#!/bin/bash

# Create macOS iconset from existing PNG icons
# This script creates an icon.iconset directory structure for electron-builder

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ICON_SOURCE_DIR="$SCRIPT_DIR/../resources/icons"
ICONSET_DIR="$ICON_SOURCE_DIR/icon.iconset"

echo "Creating macOS iconset..."

# Create iconset directory
rm -rf "$ICONSET_DIR"
mkdir -p "$ICONSET_DIR"

# Map existing icons to iconset structure
# iconset requires both 1x and 2x versions for each size

# 16x16 and 32x32 (2x)
cp "$ICON_SOURCE_DIR/icon-16x16.png" "$ICONSET_DIR/icon_16x16.png"
cp "$ICON_SOURCE_DIR/icon-32x32.png" "$ICONSET_DIR/icon_16x16@2x.png"

# 32x32 and 64x64 (2x)
cp "$ICON_SOURCE_DIR/icon-32x32.png" "$ICONSET_DIR/icon_32x32.png"
cp "$ICON_SOURCE_DIR/icon-64x64.png" "$ICONSET_DIR/icon_32x32@2x.png"

# 128x128 and 256x256 (2x)
cp "$ICON_SOURCE_DIR/icon-128x128.png" "$ICONSET_DIR/icon_128x128.png"
cp "$ICON_SOURCE_DIR/icon-256x256.png" "$ICONSET_DIR/icon_128x128@2x.png"

# 256x256 and 512x512 (2x)
cp "$ICON_SOURCE_DIR/icon-256x256.png" "$ICONSET_DIR/icon_256x256.png"
cp "$ICON_SOURCE_DIR/icon-512x512.png" "$ICONSET_DIR/icon_256x256@2x.png"

# 512x512 and 1024x1024 (2x)
cp "$ICON_SOURCE_DIR/icon-512x512.png" "$ICONSET_DIR/icon_512x512.png"
# For 1024x1024, we'll use the 512x512 as fallback (not ideal but works)
cp "$ICON_SOURCE_DIR/icon-512x512.png" "$ICONSET_DIR/icon_512x512@2x.png"

echo "✅ macOS iconset created at: $ICONSET_DIR"
echo ""
echo "Note: icon_512x512@2x.png should ideally be 1024x1024 for best quality."
echo "Consider creating a 1024x1024 version of your icon for production."
