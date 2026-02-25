create extension if not exists pg_trgm;

create table if not exists stores (
    id uuid primary key default uuid_generate_v4(),
    google_place_id varchar(128) unique,
    name varchar(200) not null,
    address varchar(300),
    phone varchar(40),
    website varchar(300),
    city varchar(120),
    state varchar(60),
    postal_code varchar(20),
    country varchar(60),
    lat double precision,
    lng double precision,
    rating double precision,
    rating_count integer,
    services_text varchar(2000),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table stores
    add column if not exists search_vector tsvector
    generated always as (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(address, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(city, '') || ' ' || coalesce(state, '') || ' ' || coalesce(postal_code, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(services_text, '')), 'D')
    ) stored;

create index if not exists idx_stores_search_vector on stores using gin (search_vector);
create index if not exists idx_stores_name_trgm on stores using gin (name gin_trgm_ops);
