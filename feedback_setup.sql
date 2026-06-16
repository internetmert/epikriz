-- Anonim geri bildirim tablosu (Supabase / Postgres)
-- Supabase Dashboard → SQL Editor'da bir kez çalıştırın.
-- Anonim kullanıcılar (publishable/anon key) YALNIZCA ekleme yapabilir; okuma/güncelleme/silme yok.
-- Geri bildirimleri yalnızca proje sahibi Dashboard → Table Editor'dan görür.

create table if not exists public.feedback (
  id          bigint generated always as identity primary key,
  message     text not null check (char_length(message) between 1 and 2000),
  created_at  timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- Aynı politikayı tekrar çalıştırmaya karşı güvenli
drop policy if exists "anon insert feedback" on public.feedback;

-- Anonim rol yalnızca INSERT (uzunluk sınırıyla). SELECT/UPDATE/DELETE politikası YOK → erişim yok.
create policy "anon insert feedback"
  on public.feedback
  for insert
  to anon
  with check (char_length(message) between 1 and 2000);
