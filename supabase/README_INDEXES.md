Как применить миграцию индексов (pg_trgm)

Файл с миграцией: supabase/migrations/0002_add_pg_trgm_indexes.sql

Требования:
- Доступ к базе данных Supabase (секрет DATABASE_URL) или supabase CLI с подключением к проекту.
- Привилегии на создание расширения pg_trgm (в Supabase это обычно разрешено).

Примеры применения:

1) Через psql (используя DATABASE_URL):

   psql "${DATABASE_URL}" -f supabase/migrations/0002_add_pg_trgm_indexes.sql

2) Через supabase CLI (если вы используете миграции и push):

   supabase db push --file supabase/migrations/0002_add_pg_trgm_indexes.sql

3) В UI Supabase → SQL Editor: откройте файл и выполните.

Пояснения и рекомендации:
- pg_trgm ускоряет операции ILIKE и похожие текстовые совпадения, особенно при больших таблицах.
- После применения индексов проверьте планы запросов (EXPLAIN) для ваших основных поисковых запросов.
- Если поиск всегда фильтруется по family_id, рассмотрите создание составного индексa, например:
  CREATE INDEX ON public.tasks USING gin ((family_id::text || ' ' || coalesce(title, '')) gin_trgm_ops);
  Но сначала проверьте реальные запросы — составные/функциональные индексы полезны в специфичных сценариях.
- Для полноты: подумайте о настройке автovacuum/analyze и мониторинге размера индексов.
