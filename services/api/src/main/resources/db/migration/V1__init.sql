create extension if not exists "uuid-ossp";

create table if not exists users (
                                     id uuid primary key default uuid_generate_v4(),
    keycloak_sub varchar(64) not null unique,
    email varchar(255),
    display_name varchar(120),
    role varchar(30) not null default 'CUSTOMER',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
    );

create index if not exists idx_users_keycloak_sub on users(keycloak_sub);
