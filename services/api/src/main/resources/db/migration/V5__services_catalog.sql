-- Master list of services (catalog)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(120) NOT NULL UNIQUE,
  description VARCHAR(2000),
  category VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Store <-> Services mapping (many-to-many)
CREATE TABLE IF NOT EXISTS store_services (
  store_id UUID NOT NULL,
  service_id UUID NOT NULL,

  base_price_cents INTEGER,
  duration_minutes INTEGER,
  notes VARCHAR(2000),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (store_id, service_id),

  CONSTRAINT fk_store_services_store
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,

  CONSTRAINT fk_store_services_service
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_store_services_store_id ON store_services(store_id);
CREATE INDEX IF NOT EXISTS idx_store_services_service_id ON store_services(service_id);
