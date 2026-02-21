create table if not exists store_reviews (
    id uuid primary key default uuid_generate_v4(),
    store_id uuid not null references stores(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    rating integer not null check (rating between 1 and 5),
    comment varchar(2000),
    created_at timestamptz not null default now()
);

create unique index if not exists uq_store_reviews_store_user on store_reviews(store_id, user_id);
create index if not exists idx_store_reviews_store_id on store_reviews(store_id);

create table if not exists saved_shops (
    user_id uuid not null references users(id) on delete cascade,
    store_id uuid not null references stores(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, store_id)
);

create index if not exists idx_saved_shops_user_id on saved_shops(user_id);
create index if not exists idx_saved_shops_store_id on saved_shops(store_id);
