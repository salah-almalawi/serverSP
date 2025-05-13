#!/usr/bin/env bash
# Print specified top-level entries and their file contents
OUTPUT="project-structure.txt"
echo "" > "$OUTPUT"

# List of entries to process
entries=(
  "bin"
  "config"
  "controllers"
  "middlewares"
  "models"
  "routes"
  "services"
  "tests"
  "utils"
  ".env.example"
  "app.js"
  "package.json"
)

for entry in "${entries[@]}"; do
  if [ -e "$entry" ]; then
    echo "$entry" >> "$OUTPUT"
    echo "----------------------------------------" >> "$OUTPUT"
    if [ -d "$entry" ]; then
      # For directories, find all files inside (excluding hidden and node_modules)
      find "$entry" -type f \
        \( -path "*/node_modules/*" -o -name ".*" \) -prune -o -print \
        -exec sh -c 'echo "{}"; sed "s/^/    /" "{}"; echo' \; >> "$OUTPUT"
    else
      # For files, print contents
      sed "s/^/    /" "$entry" >> "$OUTPUT"
      echo "" >> "$OUTPUT"
    fi
  fi
done