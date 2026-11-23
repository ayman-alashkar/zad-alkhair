#!/usr/bin/env bash
# يقارن بنية قاعدة الإنتاج بالبصمة المحفوظة. الاستعمال: scripts/db-drift.sh <ملف البصمة>
# أي فرق يعني أن الإنتاج تغيّر بغير ترحيل في المستودع، أو أن الترحيل لم يُطبَّق.
set -euo pipefail
cd "$(dirname "$0")/.."
expected=${1:-supabase/checks/fingerprint.expected}
actual=$(mktemp)
psql -X -tA -F' ' -f supabase/checks/fingerprint.sql > "$actual"
if ! diff -u "$expected" "$actual"; then
  echo "FAIL: production differs from the repo fingerprint"; exit 1
fi
echo "production matches the repo ($(wc -l < "$actual") objects)"
