-- بصمة بنية القاعدة: سطر لكل كائن في public وprivate مع بصمة md5 لتعريفه.
-- شغّله على الإنتاج وعلى قاعدة بُنيت من المستودع، ثم قارن النتيجتين. أي سطر
-- مختلف يعني أن المنشور لا يطابق المستودع. لا يقرأ أي بيانات، تعريفات فقط.
with ns as (select oid from pg_namespace where nspname in ('public','private')),
acl as (
  select a.oid, string_agg(case when x.grantee = 0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end || ':' || x.privilege_type, ',' order by case when x.grantee = 0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end, x.privilege_type) as v
    from (select oid, relacl as acl from pg_class union all select oid, proacl from pg_proc) a
    cross join lateral aclexplode(a.acl) x
   where x.grantee <> a.oid and pg_get_userbyid(x.grantee) <> 'postgres'
     -- MAINTAIN صلاحية جديدة في PostgreSQL 17 تُمنح ضمن ALL؛ تُستثنى ليتطابق الناتج بين الإصدارات
     and x.privilege_type <> 'MAINTAIN'
   group by a.oid
),
objs as (
  select 'function ' || p.pronamespace::regnamespace::text || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as obj,
         concat_ws('|', md5(replace(p.prosrc, chr(13), '')), pg_get_function_arguments(p.oid),
                   pg_get_function_result(p.oid), p.prosecdef, p.provolatile::text, p.proconfig::text,
                   (select l.lanname from pg_language l where l.oid = p.prolang),
                   coalesce((select v from acl where acl.oid = p.oid), '')) as def
    from pg_proc p
   where p.pronamespace in (select oid from ns)
     and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  union all
  select 'table ' || c.relnamespace::regnamespace::text || '.' || c.relname,
         concat_ws('|', c.relrowsecurity,
           (select string_agg(a.attname || ' ' || format_type(a.atttypid, a.atttypmod) || ' ' || a.attnotnull
                              || ' ' || a.attidentity::text || ' ' || coalesce(pg_get_expr(d.adbin, d.adrelid), ''), ',' order by a.attnum)
              from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
             where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped),
           (select string_agg(conname || ' ' || pg_get_constraintdef(oid), ',' order by conname)
              from pg_constraint where conrelid = c.oid),
           (select string_agg(pg_get_indexdef(indexrelid), ',' order by pg_get_indexdef(indexrelid)) from pg_index where indrelid = c.oid),
           (select string_agg(pg_get_triggerdef(t.oid), ',' order by t.tgname) from pg_trigger t where t.tgrelid = c.oid and not t.tgisinternal),
           (select string_agg(polname, ',' order by polname) from pg_policy where polrelid = c.oid),
           coalesce((select v from acl where acl.oid = c.oid), ''))
    from pg_class c where c.relnamespace in (select oid from ns) and c.relkind = 'r'
  union all
  select 'view ' || c.relnamespace::regnamespace::text || '.' || c.relname,
         concat_ws('|', md5(regexp_replace(pg_get_viewdef(c.oid), '\s+', ' ', 'g')), coalesce((select v from acl where acl.oid = c.oid), ''))
    from pg_class c where c.relnamespace in (select oid from ns) and c.relkind = 'v'
  union all
  select 'sequence ' || c.relnamespace::regnamespace::text || '.' || c.relname, coalesce((select v from acl where acl.oid = c.oid), '')
    from pg_class c where c.relnamespace in (select oid from ns) and c.relkind = 'S'
)
select obj, md5(def) as fingerprint from objs order by obj;
