#!/usr/bin/env bash
# يبني قاعدة من supabase/migrations ويشغّل اختبارات supabase/tests عليها.
# كل اختبار كتلة واحدة تنتهي برفع ALL_TESTS_PASSED فتُلغى تغييراتها.
# المتغيرات: PGHOST PGPORT PGUSER PGDATABASE (اتصال psql المعتاد).
#   ZAD_DB_PRE  ملف SQL اختياري يُشغَّل قبل الترحيلات (بدائل محلية مثلًا).
#   ZAD_DB_FINGERPRINT_EXPECTED  ملف البصمة المتوقعة؛ إن وُجد قورنت به البنية.
# الخيار --update يكتب بصمة القاعدة المبنية في supabase/checks/fingerprint.expected
# بدل مقارنتها (بعد إضافة ترحيل جديد).
set -euo pipefail
update=0; [ "${1:-}" = "--update" ] && update=1
cd "$(dirname "$0")/.."
psql_q() { psql -v ON_ERROR_STOP=1 -q -X "$@"; }

if [ -n "${ZAD_DB_PRE:-}" ]; then psql_q -f "$ZAD_DB_PRE"; fi
for f in supabase/migrations/*.sql; do
  echo "migrate $(basename "$f")"
  psql_q -f "$f"
done

if [ $update = 1 ]; then
  psql -X -tA -F' ' -f supabase/checks/fingerprint.sql > supabase/checks/fingerprint.expected
  echo "wrote supabase/checks/fingerprint.expected"
elif [ -n "${ZAD_DB_FINGERPRINT_EXPECTED:-}" ]; then
  actual=$(mktemp)
  psql -X -tA -F' ' -f supabase/checks/fingerprint.sql > "$actual"
  if ! diff -u "$ZAD_DB_FINGERPRINT_EXPECTED" "$actual"; then
    echo "FAIL: database built from the repo does not match the production fingerprint"
    exit 1
  fi
  echo "fingerprint matches production ($(wc -l < "$actual") objects)"
fi

failed=0
for f in supabase/tests/*.sql; do
  out=$(psql -X -q --single-transaction -f "$f" 2>&1 || true)
  if grep -q 'ALL_TESTS_PASSED' <<<"$out"; then
    echo "pass $(basename "$f")"
  else
    echo "FAIL $(basename "$f")"; echo "$out" | tail -5; failed=1
  fi
done
exit $failed
