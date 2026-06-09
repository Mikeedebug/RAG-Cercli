create table if not exists account_fr_meta (
  id uuid primary key default gen_random_uuid(),
  account_name text not null,
  feature_request_title text not null,
  priority text check (priority in ('High', 'Medium', 'Low')),
  estimated_release text,
  comments text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(account_name, feature_request_title)
);

alter table account_fr_meta enable row level security;
create policy "public rw on account_fr_meta" on account_fr_meta for all using (true);
grant select, insert, update on account_fr_meta to anon, authenticated;
