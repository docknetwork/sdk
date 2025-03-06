#!/bin/bash

# Path to the 'packages' folder
PACKAGES_DIR="./packages"
ROOT_DIR="."

# Create an empty JSON object to store dependencies and their parent package names
DEPENDENCIES_JSON="{}"
LICENSES_JSON="{}"

# Step 1: Run license-checker in the root directory
ROOT_LICENSES_JSON=$(cd "$ROOT_DIR" && npx license-checker --json)

# Merge the root license information into the global LICENSES_JSON
LICENSES_JSON=$(echo "$LICENSES_JSON" | jq ". + $ROOT_LICENSES_JSON")

# Step 2: Extract dependency keys and associate them with their parent package names
for dir in "$PACKAGES_DIR"/*; do
  if [ -d "$dir" ]; then
    PACKAGE_JSON="$dir/package.json"
    if [ -f "$PACKAGE_JSON" ]; then
      # Get the name of the current package (parent package)
      PACKAGE_NAME=$(jq -r .name "$PACKAGE_JSON")

      # Extract dependency keys (names) and store them with the parent package name
      DEPENDENCIES=$(jq -r '.dependencies | keys_unsorted[]' "$PACKAGE_JSON")

      for dep in $DEPENDENCIES; do
        # Add to the JSON object (mapping dependency to parent package)
        DEPENDENCIES_JSON=$(echo "$DEPENDENCIES_JSON" | jq --arg dep "$dep" --arg pkg "$PACKAGE_NAME" \
          '. + {($dep): $pkg}')
      done

      # Step 3: Run license-checker for each sub-package and gather licenses
      PACKAGE_LICENSES_JSON=$(cd "$dir" && npx license-checker --json)

      # Merge the package license information into the global LICENSES_JSON
      LICENSES_JSON=$(echo "$LICENSES_JSON" | jq ". + $PACKAGE_LICENSES_JSON")
    fi
  fi
done

# Step 4: Filter the license-checker output, ensuring it only shows dependencies found in DEPENDENCIES_JSON
if [ "$ONLY_NON_MIT" == "true" ]; then
  # Only select MIT licenses if ONLY_NON_MIT is true
  echo "$LICENSES_JSON" | jq -r "
    to_entries |
    map(select(
      (.value.licenses | contains(\"MIT\")) | not
    )) | # Only select dependencies that don't have MIT license
    .[] |
    {
      package: .key | split(\"@\")[0],  # Only get the package name (remove version)
      license: .value.licenses,
      parentPackage: (\$dependencies_json[(.key | split(\"@\")[0])] // \"Unknown\")
    }
  " --argjson dependencies_json "$DEPENDENCIES_JSON" | jq -r '
    select(.parentPackage != null and .parentPackage != "Unknown") |
    {
      package: .package,  # Keep the package name intact (without version)
      license: .license,
      parentPackage: .parentPackage
    } |
    "\(.parentPackage) depends on \(.package) with license \(.license)"
  ' | sort -u  # Sort and remove duplicates
else
  # Select dependencies that have any license
  echo "$LICENSES_JSON" | jq -r "
    to_entries |
    .[] |
    {
      package: .key | split(\"@\")[0],  # Only get the package name (remove version)
      license: .value.licenses,
      parentPackage: (\$dependencies_json[(.key | split(\"@\")[0])] // \"Unknown\")
    }
  " --argjson dependencies_json "$DEPENDENCIES_JSON" | jq -r '
    select(.parentPackage != null and .parentPackage != "Unknown") |
    {
      package: .package,  # Keep the package name intact (without version)
      license: .license,
      parentPackage: .parentPackage
    } |
    "\(.parentPackage) depends on \(.package) with license \(.license)"
  ' | sort -u  # Sort and remove duplicates
fi
