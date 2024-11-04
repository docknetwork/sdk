#!/bin/bash

# Usage: ./generate_exports.sh /path/to/package.json

# Get the path to package.json from the first argument
PACKAGE_JSON_PATH="$1"

if [ -z "$PACKAGE_JSON_PATH" ]; then
  echo "Error: No package.json path provided."
  exit 1
fi

# Determine the root directory of the package.json file
ROOT_DIR="$(dirname "$PACKAGE_JSON_PATH")"
DIST_ESM="$ROOT_DIR/dist/esm"
DIST_CJS="$ROOT_DIR/dist/cjs"

# Check that esm and cjs directories exist
if [ ! -d "$DIST_ESM" ] || [ ! -d "$DIST_CJS" ]; then
  echo "Error: Missing dist/esm or dist/cjs directories."
  exit 1
fi

# Start the exports structure as a JSON object
EXPORTS_JSON=$(jq -n '{".": {"import": "./dist/esm/index.js", "require": "./dist/cjs/index.cjs"}}')

# Iterate over subdirectories in esm and add entries to the exports JSON object
for DIR in "$DIST_ESM"/*/; do
  DIR_NAME=$(basename "$DIR")
  
  # Add both "./subdir" and "./subdir/*" entries
  EXPORTS_JSON=$(echo "$EXPORTS_JSON" | jq \
    --arg name "./$DIR_NAME" \
    --arg importPath "./dist/esm/$DIR_NAME/index.js" \
    --arg requirePath "./dist/cjs/$DIR_NAME/index.cjs" \
    '.[$name] = {"import": $importPath, "require": $requirePath}')
  
  EXPORTS_JSON=$(echo "$EXPORTS_JSON" | jq \
    --arg name "./$DIR_NAME/*" \
    --arg importPath "./dist/esm/$DIR_NAME/*.js" \
    --arg requirePath "./dist/cjs/$DIR_NAME/*.cjs" \
    '.[$name] = {"import": $importPath, "require": $requirePath}')
done

# Add the catch-all rule at the end
EXPORTS_JSON=$(echo "$EXPORTS_JSON" | jq \
  '.["./*"] = {"import": "./dist/esm/*.js", "require": "./dist/cjs/*.cjs"}')

# Remove existing exports field, if any, and add the new exports field
jq "del(.exports) | .exports = $EXPORTS_JSON" "$PACKAGE_JSON_PATH" > "$PACKAGE_JSON_PATH.tmp" && mv "$PACKAGE_JSON_PATH.tmp" "$PACKAGE_JSON_PATH"

echo "Exports field generated and updated in $PACKAGE_JSON_PATH."
