#!/bin/bash
# Run POMI coder on a single BQ file
# Usage: bash run.sh <file.xlsx> [options]
#
# Project params (edit defaults below or pass as args):
#   bash run.sh Data/AKAM/Bill05.xlsx --country UAE --city Dubai --project "AKAM Mall"
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

FILE="${1:?Usage: bash run.sh <file.xlsx>}"
shift  # remaining args passed through

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
    ${CURRENCY:+--currency "$CURRENCY"} \
    "$@"
