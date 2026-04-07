#!/bin/bash
# ─────────────────────────────────────────────────
# SpoilerHub Auto-Sync Cron Job
# Runs: AniList sync → Gemini translate → all to production DB
# Schedule: every 6 hours via macOS launchd
# ─────────────────────────────────────────────────

set -euo pipefail

# Paths
PROJECT_DIR="/Users/weerawatposeeya/Desktop/code/spoiler"
BUN="$HOME/.bun/bin/bun"
LOG_FILE="$PROJECT_DIR/logs/sync-$(date +%Y%m%d-%H%M%S).log"

# Production DB (Railway)
export DATABASE_URL="postgresql://postgres:RoQIiFGBAxNKXTUsenmJuGokkPbnLQqt@junction.proxy.rlwy.net:21164/railway"

# Node path for Gemini CLI
export PATH="/opt/homebrew/Cellar/node/25.8.0/bin:/opt/homebrew/bin:$HOME/.bun/bin:$PATH"

# Ensure log directory exists
mkdir -p "$PROJECT_DIR/logs"

cd "$PROJECT_DIR"

echo "═══════════════════════════════════════════" | tee -a "$LOG_FILE"
echo "SpoilerHub Sync — $(date)" | tee -a "$LOG_FILE"
echo "═══════════════════════════════════════════" | tee -a "$LOG_FILE"

# Step 1: Sync from AniList
echo "" | tee -a "$LOG_FILE"
echo "▶ Step 1: AniList Sync..." | tee -a "$LOG_FILE"
$BUN run src/scripts/sync-anilist.ts 2>&1 | tee -a "$LOG_FILE"

# Step 2: Translate with Google Translate (free, no API key)
echo "" | tee -a "$LOG_FILE"
echo "▶ Step 2: Google Translate (untranslated only)..." | tee -a "$LOG_FILE"
$BUN run src/scripts/translate-series.ts 2>&1 | tee -a "$LOG_FILE"

# Step 3: Try Gemini CLI for better quality (optional, may fail on quota)
echo "" | tee -a "$LOG_FILE"
echo "▶ Step 3: Gemini CLI re-translate (improving quality)..." | tee -a "$LOG_FILE"
$BUN run src/scripts/translate-gemini.ts --all 2>&1 | tee -a "$LOG_FILE" || {
  echo "  ⚠ Gemini CLI failed (likely quota), Google Translate results kept" | tee -a "$LOG_FILE"
}

echo "" | tee -a "$LOG_FILE"
echo "✓ Sync complete at $(date)" | tee -a "$LOG_FILE"

# Cleanup old logs (keep last 7 days)
find "$PROJECT_DIR/logs" -name "sync-*.log" -mtime +7 -delete 2>/dev/null || true
