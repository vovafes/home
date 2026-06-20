-- ============================================================
--  Дом — семейный хаб. SQL-схема для Supabase
--  Выполните этот файл в Supabase → SQL Editor
-- ============================================================

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
  checked_by UUID REFERENCES auth.users(id),
  checked_at TIMESTAMPTZ,
  added_by   UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── События календаря ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  start_date  DATE NOT NULL,
  end_date    DATE,
  start_time  TIME,
  end_time    TIME,
  all_day     BOOLEAN DEFAULT TRUE,
  color       TEXT NOT NULL DEFAULT '#4F46E5',
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Задачи / уборка ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT,
  completed    BOOLEAN DEFAULT FALSE,
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_by   UUID NOT NULL REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security ───────────────────────────────────────
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks           ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Все видят профили"
  ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Пользователь создаёт свой профиль"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Пользователь обновляет свой профиль"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Stores (все члены семьи могут управлять)
CREATE POLICY "Все видят магазины"
  ON public.stores FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Все могут создавать магазины"
  ON public.stores FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Все могут изменять магазины"
  ON public.stores FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Все могут удалять магазины"
  ON public.stores FOR DELETE USING (auth.role() = 'authenticated');

-- Shopping items
CREATE POLICY "Все видят товары"
  ON public.shopping_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Все могут добавлять товары"
  ON public.shopping_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Все могут изменять товары"
  ON public.shopping_items FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Все могут удалять товары"
  ON public.shopping_items FOR DELETE USING (auth.role() = 'authenticated');

-- Calendar events
CREATE POLICY "Все видят события"
  ON public.calendar_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Все могут создавать события"
  ON public.calendar_events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Все могут изменять события"
  ON public.calendar_events FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Все могут удалять события"
  ON public.calendar_events FOR DELETE USING (auth.role() = 'authenticated');

-- Tasks
CREATE POLICY "Все видят задачи"
  ON public.tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Все могут создавать задачи"
  ON public.tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Все могут изменять задачи"
  ON public.tasks FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Все могут удалять задачи"
  ON public.tasks FOR DELETE USING (auth.role() = 'authenticated');

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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Дефолтные магазины ──────────────────────────────────────
INSERT INTO public.stores (name, icon, color, order_index) VALUES
  ('Продукты',         '🛒', '#16A34A', 0),
  ('Бытовая химия',    '🧴', '#0284C7', 1),
  ('Товары для дома',  '🏠', '#7C3AED', 2),
  ('Аптека',           '💊', '#DC2626', 3),
  ('Зоотовары',        '🐾', '#D97706', 4)
ON CONFLICT DO NOTHING;

-- ─── Storage bucket для фото ──────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('photos', 'photos', true, 5242880)   -- 5 MB лимит
ON CONFLICT DO NOTHING;

CREATE POLICY "Загрузка фото"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');
CREATE POLICY "Просмотр фото"
  ON storage.objects FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "Удаление фото"
  ON storage.objects FOR DELETE USING (bucket_id = 'photos' AND auth.role() = 'authenticated');
