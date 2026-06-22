-- ============================================================
--  Исправление RLS-политик (выполнить в Supabase → SQL Editor)
--
--  Причина: auth.role() в новых проектах Supabase читает устаревший
--  путь JWT-claim и возвращает NULL, поэтому условие
--  `auth.role() = 'authenticated'` блокировало INSERT даже для
--  авторизованных пользователей (ошибка 42501).
--  Везде заменяем на auth.uid(), который работает корректно.
-- ============================================================

-- ─── families: создание семьи ────────────────────────────────
-- Было: WITH CHECK (auth.role() = 'authenticated')  → не работало.
DROP POLICY IF EXISTS "Создать семью" ON public.families;
CREATE POLICY "Создать семью" ON public.families FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- ─── families: видимость ─────────────────────────────────────
-- Создатель должен видеть семью сразу после INSERT (...).select(),
-- когда строки в family_members ещё нет.
DROP POLICY IF EXISTS "Видеть свою семью" ON public.families;
CREATE POLICY "Видеть свою семью" ON public.families FOR SELECT
  USING (created_by = auth.uid() OR id IN (SELECT public.get_my_family_ids()));

-- ─── storage: загрузка / удаление фото ───────────────────────
DROP POLICY IF EXISTS "Загрузка фото" ON storage.objects;
CREATE POLICY "Загрузка фото" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'photos' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Удаление фото" ON storage.objects;
CREATE POLICY "Удаление фото" ON storage.objects FOR DELETE
  USING (bucket_id = 'photos' AND auth.uid() IS NOT NULL);

-- ─── join по коду: безопасный RPC ────────────────────────────
-- Позволяет найти семью по инвайт-коду и вступить, не открывая
-- SELECT-доступ ко всем семьям (иначе любой залогиненный видел бы
-- чужие коды). Используется обновлённым кодом setup-страницы.
CREATE OR REPLACE FUNCTION public.join_family(p_code text)
RETURNS public.families
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_family public.families;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  SELECT * INTO v_family FROM public.families
    WHERE invite_code = upper(trim(p_code));
  IF v_family.id IS NULL THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  -- Проверки: не отозван, не просрочен
  IF v_family.invite_revoked THEN
    RAISE EXCEPTION 'invite_revoked';
  END IF;
  IF v_family.invite_expires_at IS NOT NULL AND v_family.invite_expires_at < now() THEN
    RAISE EXCEPTION 'invite_expired';
  END IF;
  INSERT INTO public.family_members (family_id, user_id)
  VALUES (v_family.id, auth.uid())
  ON CONFLICT DO NOTHING;
  -- Если одноразовый код — отозвать после успешного присоединения
  IF v_family.invite_single_use THEN
    UPDATE public.families SET invite_revoked = TRUE WHERE id = v_family.id;
  END IF;
  RETURN v_family;
END;
$$;
GRANT EXECUTE ON FUNCTION public.join_family(text) TO authenticated;
