#!/bin/bash
# Run POMI coder on all Excel files in a folder
# Usage: bash run_folder.sh Data/AKAM
#
# ── Edit these defaults for your project ──────────────────────────────────────
COUNTRY=""
CITY=""
ASSET=""
PROJECT=""
TYPE=""
EMPLOYER=""
CONTRACTOR=""
CONTRACT_TYPE=""
TENDER_DATE=""
AWARD_DATE=""
CURRENCY=""
# ──────────────────────────────────────────────────────────────────────────────

export ANTHROPIC_API_KEY=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

FOLDER="${1:?Usage: bash run_folder.sh <folder>}"

if [ ! -d "$FOLDER" ]; then
    echo "❌  Folder not found: $FOLDER"
    exit 1
fi

FILES=("$FOLDER"/*.xlsx)
if [ ${#FILES[@]} -eq 0 ] || [ ! -f "${FILES[0]}" ]; then
    echo "❌  No .xlsx files found in $FOLDER"
    exit 1
fi

echo "========================================================"
echo "  BATCH RUN — $FOLDER"
echo "  Files found: ${#FILES[@]}"
echo "========================================================"

TOTAL_COST=0
PASS=0
FAIL=0

for FILE in "${FILES[@]}"; do
    BASENAME=$(basename "$FILE")
    echo ""
    echo "▶  Processing: $BASENAME"
    echo "────────────────────────────────────────────────────────"

    python3 pomi_coder_app.py POMI_CODING_FINAL.xlsx "$FILE" --ai --batch 40 \
        ${COUNTRY:+--country "$COUNTRY"} \
        ${CITY:+--city "$CITY"} \
        ${ASSET:+--asset "$ASSET"} \
        ${PROJECT:+--project "$PROJECT"} \
        ${TYPE:+--type "$TYPE"} \
        ${EMPLOYER:+--employer "$EMPLOYER"} \
        ${CONTRACTOR:+--contractor "$CONTRACTOR"} \
        ${CONTRACT_TYPE:+--contract-type "$CONTRACT_TYPE"} \
        ${TENDER_DATE:+--tender-date "$TENDER_DATE"} \
        ${AWARD_DATE:+--award-date "$AWARD_DATE"} \
        ${CURRENCY:+--currency "$CURRENCY"}
    STATUS=$?

    if [ $STATUS -eq 0 ]; then
        PASS=$((PASS + 1))
    else
        echo "  ⚠  FAILED: $BASENAME"
        FAIL=$((FAIL + 1))
    fi
done

echo ""
echo "========================================================"
echo "  BATCH COMPLETE"
echo "  ✅  Passed : $PASS"
echo "  ❌  Failed : $FAIL"
echo "  Output files saved alongside each input file"
echo "========================================================"
