#!/bin/bash

# PDF Template Compression Script
# Uses Ghostscript to compress PDFs while preserving vector quality
# Usage: pnpm pdf:compress <input.pdf> [output.pdf]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Ghostscript is installed
if ! command -v gs &> /dev/null; then
    echo -e "${RED}Error: Ghostscript is not installed.${NC}"
    echo "Install it with: brew install ghostscript"
    exit 1
fi

# Check arguments
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage:${NC} pnpm pdf:compress <input.pdf> [output.pdf]"
    echo ""
    echo "Examples:"
    echo "  pnpm pdf:compress template.pdf                    # Output: template-compressed.pdf"
    echo "  pnpm pdf:compress template.pdf public/output.pdf  # Output: public/output.pdf"
    exit 1
fi

INPUT_FILE="$1"

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${RED}Error: Input file '$INPUT_FILE' not found.${NC}"
    exit 1
fi

# Determine output file
if [ -z "$2" ]; then
    # Generate output filename by adding -compressed before .pdf
    BASENAME=$(basename "$INPUT_FILE" .pdf)
    DIRNAME=$(dirname "$INPUT_FILE")
    OUTPUT_FILE="${DIRNAME}/${BASENAME}-compressed.pdf"
else
    OUTPUT_FILE="$2"
fi

# Get original file size
ORIGINAL_SIZE=$(du -h "$INPUT_FILE" | cut -f1)

echo -e "${YELLOW}Compressing PDF...${NC}"
echo "  Input:  $INPUT_FILE ($ORIGINAL_SIZE)"
echo "  Output: $OUTPUT_FILE"

# Run Ghostscript compression
gs -sDEVICE=pdfwrite \
   -dCompatibilityLevel=1.4 \
   -dPDFSETTINGS=/prepress \
   -dNOPAUSE \
   -dQUIET \
   -dBATCH \
   -sOutputFile="$OUTPUT_FILE" \
   "$INPUT_FILE"

# Get new file size
NEW_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)

echo -e "${GREEN}Done!${NC}"
echo "  Original: $ORIGINAL_SIZE"
echo "  Compressed: $NEW_SIZE"
