-- ============================================================
--  Дом — семейный хаб. SQL-схема для Supabase
--  Выполните этот файл в Supabase → SQL Editor
-- ============================================================

-- ─── Семьи ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.families (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT upper(substring(md5(random()::text), 1, 6)),
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.family_members (
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (family_id, user_id)
);

-- ─── Профили пользователей ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  avatar_url TEXT,
  color      TEXT NOT NULL DEFAULT '#4F46E5',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Магазины ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT '🛒',
  color       TEXT NOT NULL DEFAULT '#4F46E5',
  order_index INTEGER DEFAULT 0,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Товары в списке покупок ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shopping_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  note       TEXT,
  quantity   NUMERIC,
  unit       TEXT,
  photo_url  TEXT,
  checked    BOOLEAN DEFAULT FALSE,
  checked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  checked_at TIMESTAMPTZ,
  added_by   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── События календаря ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  location    TEXT,
  start_date  DATE NOT NULL,
  end_date    DATE,
  start_time  TIME,
  end_time    TIME,
  all_day     BOOLEAN DEFAULT TRUE,
  color       TEXT NOT NULL DEFAULT '#4F46E5',
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Если таблица уже существует, добавить столбец location
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS location TEXT;

-- ─── Задачи / уборка ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT,
  completed    BOOLEAN DEFAULT FALSE,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_by   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security ───────────────────────────────────────
-- family_id в таблицах данных
ALTER TABLE public.stores          ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id);
ALTER TABLE public.tasks           ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id);
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id);

ALTER TABLE public.families        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks           ENABLE ROW LEVEL SECURITY;

-- Вспомогательная функция: возвращает family_id текущего пользователя.
-- SECURITY DEFINER обходит RLS при внутреннем запросе → нет рекурсии.
CREATE OR REPLACE FUNCTION public.get_my_family_ids()
RETURNS SETOF UUID LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
$$;

-- Сброс политик перед созданием (безопасно при повторном запуске)
DROP POLICY IF EXISTS "Видеть свою семью"         ON public.families;
DROP POLICY IF EXISTS "Создать семью"              ON public.families;
DROP POLICY IF EXISTS "Обновить свою семью"        ON public.families;
DROP POLICY IF EXISTS "Видеть участников семьи"    ON public.family_members;
DROP POLICY IF EXISTS "Вступить в семью"           ON public.family_members;
DROP POLICY IF EXISTS "Покинуть семью"             ON public.family_members;
DROP POLICY IF EXISTS "Видеть профили своей семьи" ON public.profiles;
DROP POLICY IF EXISTS "Пользователь создаёт свой профиль" ON public.profiles;
DROP POLICY IF EXISTS "Пользователь обновляет свой профиль" ON public.profiles;
DROP POLICY IF EXISTS "Семья видит магазины"   ON public.stores;
DROP POLICY IF EXISTS "Семья создаёт магазины" ON public.stores;
DROP POLICY IF EXISTS "Семья изменяет магазины" ON public.stores;
DROP POLICY IF EXISTS "Семья удаляет магазины"  ON public.stores;
DROP POLICY IF EXISTS "Семья видит товары"    ON public.shopping_items;
DROP POLICY IF EXISTS "Семья добавляет товары" ON public.shopping_items;
DROP POLICY IF EXISTS "Семья изменяет товары"  ON public.shopping_items;
DROP POLICY IF EXISTS "Семья удаляет товары"   ON public.shopping_items;
DROP POLICY IF EXISTS "Семья видит события"    ON public.calendar_events;
DROP POLICY IF EXISTS "Семья создаёт события"  ON public.calendar_events;
DROP POLICY IF EXISTS "Семья изменяет события" ON public.calendar_events;
DROP POLICY IF EXISTS "Семья удаляет события"  ON public.calendar_events;
DROP POLICY IF EXISTS "Семья видит задачи"     ON public.tasks;
DROP POLICY IF EXISTS "Семья создаёт задачи"   ON public.tasks;
DROP POLICY IF EXISTS "Семья изменяет задачи"  ON public.tasks;
DROP POLICY IF EXISTS "Семья удаляет задачи"   ON public.tasks;

-- Families
CREATE POLICY "Видеть свою семью" ON public.families FOR SELECT
  USING (id IN (SELECT public.get_my_family_ids()));
CREATE POLICY "Создать семью" ON public.families FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Обновить свою семью" ON public.families FOR UPDATE
  USING (created_by = auth.uid());

-- Family members
CREATE POLICY "Видеть участников семьи" ON public.family_members FOR SELECT
  USING (family_id IN (SELECT public.get_my_family_ids()));
CREATE POLICY "Вступить в семью" ON public.family_members FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Покинуть семью" ON public.family_members FOR DELETE
  USING (user_id = auth.uid());

-- Profiles
CREATE POLICY "Видеть профили своей семьи" ON public.profiles FOR SELECT
  USING (
    id = auth.uid() OR
    id IN (
      SELECT fm.user_id FROM public.family_members fm
      WHERE fm.family_id IN (SELECT public.get_my_family_ids())
    )
  );
CREATE POLICY "Пользователь создаёт свой профиль" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Пользователь обновляет свой профиль" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Stores
CREATE POLICY "Семья видит магазины" ON public.stores FOR SELECT
  USING (family_id IN (SELECT public.get_my_family_ids()));
CREATE POLICY "Семья создаёт магазины" ON public.stores FOR INSERT
  WITH CHECK (family_id IN (SELECT public.get_my_family_ids()));
CREATE POLICY "Семья изменяет магазины" ON public.stores FOR UPDATE
  USING (family_id IN (SELECT public.get_my_family_ids()));
CREATE POLICY "Семья удаляет магазины" ON public.stores FOR DELETE
  USING (family_id IN (SELECT public.get_my_family_ids()));

-- Shopping items
CREATE POLICY "Семья видит товары" ON public.shopping_items FOR SELECT
  USING (store_id IN (SELECT id FROM public.stores WHERE family_id IN (SELECT public.get_my_family_ids())));
CREATE POLICY "Семья добавляет товары" ON public.shopping_items FOR INSERT
  WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE family_id IN (SELECT public.get_my_family_ids())));
CREATE POLICY "Семья изменяет товары" ON public.shopping_items FOR UPDATE
  USING (store_id IN (SELECT id FROM public.stores WHERE family_id IN (SELECT public.get_my_family_ids())));
CREATE POLICY "Семья удаляет товары" ON public.shopping_items FOR DELETE
  USING (store_id IN (SELECT id FROM public.stores WHERE family_id IN (SELECT public.get_my_family_ids())));

-- Calendar events
CREATE POLICY "Семья видит события" ON public.calendar_events FOR SELECT
  USING (family_id IN (SELECT public.get_my_family_ids()));
CREATE POLICY "Семья создаёт события" ON public.calendar_events FOR INSERT
  WITH CHECK (family_id IN (SELECT public.get_my_family_ids()));
CREATE POLICY "Семья изменяет события" ON public.calendar_events FOR UPDATE
  USING (family_id IN (SELECT public.get_my_family_ids()));
CREATE POLICY "Семья удаляет события" ON public.calendar_events FOR DELETE
  USING (family_id IN (SELECT public.get_my_family_ids()));

-- Tasks
CREATE POLICY "Семья видит задачи" ON public.tasks FOR SELECT
  USING (family_id IN (SELECT public.get_my_family_ids()));
CREATE POLICY "Семья создаёт задачи" ON public.tasks FOR INSERT
  WITH CHECK (family_id IN (SELECT public.get_my_family_ids()));
CREATE POLICY "Семья изменяет задачи" ON public.tasks FOR UPDATE
  USING (family_id IN (SELECT public.get_my_family_ids()));
CREATE POLICY "Семья удаляет задачи" ON public.tasks FOR DELETE
  USING (family_id IN (SELECT public.get_my_family_ids()));

-- ─── Автосоздание профиля при регистрации ────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, color)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'color', '#4F46E5')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Бэкфилл профилей для пользователей, зарегистрированных до появления триггера
INSERT INTO public.profiles (id, name, color)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
       COALESCE(u.raw_user_meta_data->>'color', '#4F46E5')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ─── Дефолтные магазины ──────────────────────────────────────
-- Магазины теперь привязаны к семье (family_id NOT NULL), поэтому
-- глобальные seed-данные здесь не нужны. Магазины создаются семьёй
-- через интерфейс приложения.

-- ─── Storage bucket для фото ──────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('photos', 'photos', true, 5242880)   -- 5 MB лимит
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Загрузка фото" ON storage.objects;
DROP POLICY IF EXISTS "Просмотр фото"  ON storage.objects;
DROP POLICY IF EXISTS "Удаление фото"  ON storage.objects;
CREATE POLICY "Загрузка фото"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Просмотр фото"
  ON storage.objects FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "Удаление фото"
  ON storage.objects FOR DELETE USING (bucket_id = 'photos' AND auth.uid() IS NOT NULL);

-- ─── Миграция существующих БД: перенаправить FK на public.profiles ──
-- Колонки изначально ссылались на auth.users, из-за чего PostgREST не мог
-- построить embed `profiles:added_by(...)` и сохранение падало с PGRST200.
-- Этот блок безопасно чинит уже развёрнутые базы при повторном запуске.
DO $$
BEGIN
  ALTER TABLE public.shopping_items DROP CONSTRAINT IF EXISTS shopping_items_added_by_fkey;
  ALTER TABLE public.shopping_items DROP CONSTRAINT IF EXISTS shopping_items_checked_by_fkey;
  ALTER TABLE public.shopping_items DROP CONSTRAINT IF EXISTS shopping_items_added_by_profiles_fkey;
  ALTER TABLE public.shopping_items DROP CONSTRAINT IF EXISTS shopping_items_checked_by_profiles_fkey;
  ALTER TABLE public.shopping_items
    ADD CONSTRAINT shopping_items_added_by_profiles_fkey
    FOREIGN KEY (added_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
  ALTER TABLE public.shopping_items
    ADD CONSTRAINT shopping_items_checked_by_profiles_fkey
    FOREIGN KEY (checked_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

  ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;
  ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_completed_by_fkey;
  ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_created_by_profiles_fkey;
  ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_completed_by_profiles_fkey;
  ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_created_by_profiles_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
  ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_completed_by_profiles_fkey
    FOREIGN KEY (completed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

  ALTER TABLE public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_user_id_fkey;
  ALTER TABLE public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_user_id_profiles_fkey;
  ALTER TABLE public.calendar_events
    ADD CONSTRAINT calendar_events_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
END $$;

NOTIFY pgrst, 'reload schema';
