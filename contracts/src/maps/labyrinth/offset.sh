#!/bin/bash

# Check if a directory has been provided
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 directory offset"
    exit 1
fi

# Get the directory from the command line argument
directory=$1 
offset=$2

# Find all .yaml files recursively in the provided directory
find "$directory" -type f -name "*.yaml" -print0 | while IFS= read -r -d '' file
do
    # Run the command for each found file and redirect output to a temporary file
    temp_file=$(mktemp)
    ds offset "$offset" -f "$file" > "$temp_file"

    # Move the temporary file to the original file
    mv "$temp_file" "$file"
done
