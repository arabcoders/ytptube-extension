#!/usr/bin/env bash
set -e

zip_file="ytptube-extension.zip"
extension_dir="./src"
if [ -f "$zip_file" ]; then
    echo "Removing existing zip file: $zip_file"
    rm "$zip_file"
fi

IGNORE_FILES=(
    "*.git*"
    "*.vscode*"
    "*.idea*"
    "*.DS_Store"
    "node_modules/*"
    "dist/*"
    "build/*"
    "screenshots/*"
)

echo "Creating zip file: $zip_file"

# The zip file should contain the contents of the src directory not the directory itself
(
    cd "$extension_dir" || exit 1
    zip -r "../$zip_file" . -x "${IGNORE_FILES[@]}"
)

