#!/usr/bin/env bash
# يطبّق على الإنتاج ترحيلات supabase/migrations التي لم تُسجَّل فيه بعد، كلٌّ في
# معاملة واحدة مع تسجيله في supabase_migrations.schema_migrations.
# الاتصال من متغيرات psql المعتادة (PGHOST وPGUSER وPGPASSWORD ...).
#   --dry-run  يعرض المعلّق دون تطبيق.
set -euo pipefail
cd "$(dirname "$0")/.."
dry=0; [ "${1:-}" = "--dry-run" ] && dry=1
applied=$(psql -X -tA -c "select version from supabase_migrations.schema_migrations")
pending=0
for f in supabase/migrations/*.sql; do
  base=$(basename "$f" .sql); version=${base%%_*}; name=${base#*_}
  if grep -qx "$version" <<<"$applied"; then continue; fi
  pending=$((pending + 1))
  if [ $dry = 1 ]; then echo "pending $base"; continue; fi
  echo "apply $base"
  psql -X -v ON_ERROR_STOP=1 -q --single-transaction -f "$f" \
    -c "insert into supabase_migrations.schema_migrations (version, name, created_by) values ('$version', '$name', 'github-actions')"
done
echo "$pending pending migration(s)"
