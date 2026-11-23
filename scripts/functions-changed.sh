#!/usr/bin/env bash
# يطبع أسماء الوظائف التي تغيّرت بين التزامين. تغيّر _shared يعني كل الوظائف.
# الاستعمال: scripts/functions-changed.sh <من> <إلى>
set -euo pipefail
cd "$(dirname "$0")/.."
from=$1; to=$2
all=$(find supabase/functions -mindepth 1 -maxdepth 1 -type d ! -name '_*' -printf '%f\n' | sort)
if ! git cat-file -e "$from^{commit}" 2>/dev/null; then echo "$all"; exit 0; fi
changed=$(git diff --name-only "$from" "$to" -- supabase/functions)
if grep -q '^supabase/functions/_' <<<"$changed"; then echo "$all"; exit 0; fi
for fn in $all; do
  if grep -q "^supabase/functions/$fn/" <<<"$changed"; then echo "$fn"; fi
done
