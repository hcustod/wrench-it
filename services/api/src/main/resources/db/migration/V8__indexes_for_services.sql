CREATE INDEX IF NOT EXISTS idx_store_services_service_id
  ON store_services(service_id);


CREATE INDEX IF NOT EXISTS idx_store_services_store_id
  ON store_services(store_id);
