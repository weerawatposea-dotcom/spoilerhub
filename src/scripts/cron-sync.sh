#!/bin/bash
# ─────────────────────────────────────────────────
# SpoilerHub Auto-Sync Cron Job
# Runs every 6 hours via macOS launchd
#
# Pipeline:
#   1. AniList sync (new series)
#   2. Fetch real spoilers from MAL + AniList reviews
#   3. Generate spoilers for series with < 5
#   4. Translate series titles to Thai
#   5. Gemini CLI re-translate (optional, better quality)
# ─────────────────────────────────────────────────

set -euo pipefail

# Paths
PROJECT_DIR="/Users/weerawatposeeya/Desktop/code/spoiler"
BUN="$HOME/.bun/bin/bun"
LOG_FILE="$PROJECT_DIR/logs/sync-$(date +%Y%m%d-%H%M%S).log"

# Production DB (Railway Singapore)
export DATABASE_URL="postgresql://postgres:RoQIiFGBAxNKXTUsenmJuGokkPbnLQqt@junction.proxy.rlwy.net:21164/railway"

# Node path for Gemini CLI
export PATH="/opt/homebrew/Cellar/node/25.8.0/bin:/opt/homebrew/bin:$HOME/.bun/bin:$PATH"

# Ensure log directory exists
mkdir -p "$PROJECT_DIR/logs"

cd "$PROJECT_DIR"

echo "═══════════════════════════════════════════" | tee -a "$LOG_FILE"
echo "SpoilerHub Sync — $(date)" | tee -a "$LOG_FILE"
echo "═══════════════════════════════════════════" | tee -a "$LOG_FILE"

# Step 1: Sync new series from AniList
echo "" | tee -a "$LOG_FILE"
echo "▶ Step 1: AniList Sync (trending + recent)..." | tee -a "$LOG_FILE"
$BUN run src/scripts/sync-anilist.ts 2>&1 | tee -a "$LOG_FILE"

# Step 2: Fetch REAL spoilers from MAL + AniList reviews
echo "" | tee -a "$LOG_FILE"
echo "▶ Step 2: Fetch real spoilers from MAL + AniList..." | tee -a "$LOG_FILE"
$BUN run src/scripts/fetch-real-spoilers.ts --limit=50 2>&1 | tee -a "$LOG_FILE" || {
  echo "  ⚠ Real spoiler fetch failed, continuing..." | tee -a "$LOG_FILE"
}

# Step 3: Update latest chapter numbers from MangaDex + generate spoilers for latest chapters
echo "" | tee -a "$LOG_FILE"
echo "▶ Step 3: Update latest chapters (MangaDex)..." | tee -a "$LOG_FILE"
$BUN run src/scripts/update-latest-chapters.ts --limit=100 2>&1 | tee -a "$LOG_FILE" || {
  echo "  ⚠ Latest chapter update failed, continuing..." | tee -a "$LOG_FILE"
}

# Step 4: Generate spoilers for series with < 5 spoilers
echo "" | tee -a "$LOG_FILE"
echo "▶ Step 3: Generate spoilers for new series..." | tee -a "$LOG_FILE"
$BUN run src/scripts/mass-generate-spoilers.ts --offset=0 --limit=100 --batch=cron 2>&1 | tee -a "$LOG_FILE" || {
  echo "  ⚠ Spoiler generation failed, continuing..." | tee -a "$LOG_FILE"
}

# Step 4: Translate untranslated series titles to Thai
echo "" | tee -a "$LOG_FILE"
echo "▶ Step 4: Translate series titles to Thai..." | tee -a "$LOG_FILE"
$BUN run src/scripts/translate-series.ts 2>&1 | tee -a "$LOG_FILE" || {
  echo "  ⚠ Translation failed, continuing..." | tee -a "$LOG_FILE"
}

# Step 5: Try Gemini CLI for better translations (optional)
echo "" | tee -a "$LOG_FILE"
echo "▶ Step 5: Gemini CLI re-translate (optional)..." | tee -a "$LOG_FILE"
$BUN run src/scripts/translate-gemini.ts 2>&1 | tee -a "$LOG_FILE" || {
  echo "  ⚠ Gemini CLI failed (likely quota), keeping existing translations" | tee -a "$LOG_FILE"
}

echo "" | tee -a "$LOG_FILE"
echo "✓ Full sync complete at $(date)" | tee -a "$LOG_FILE"

# Cleanup old logs (keep last 7 days)
find "$PROJECT_DIR/logs" -name "sync-*.log" -mtime +7 -delete 2>/dev/null || true
