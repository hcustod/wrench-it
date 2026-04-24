WITH coordinates (google_place_id, lat, lng) AS (
  VALUES
    ('real-gta-northyork-001', 43.7936706, -79.4187850),
    ('real-gta-thornhill-001', 43.8160779, -79.4244956),
    ('real-gta-northyork-002', 43.7801164, -79.4444045),
    ('real-gta-northyork-003', 43.7709985, -79.4238934),
    ('real-gta-northyork-004', 43.7964793, -79.4147338),
    ('real-gta-northyork-005', 43.7857926, -79.3911872),
    ('real-gta-northyork-006', 43.7893075, -79.4177147),
    ('real-gta-northyork-007', 43.7810447, -79.4087080),
    ('real-gta-northyork-008', 43.7622320, -79.4102442),
    ('real-gta-northyork-009', 43.7611784, -79.4089583),
    ('real-gta-etobicoke-001', 43.6268631, -79.5420193),
    ('real-gta-etobicoke-002', 43.6263720, -79.5417842),
    ('real-gta-etobicoke-003', 43.6351627, -79.5287986),
    ('real-gta-etobicoke-004', 43.6363673, -79.5280284),
    ('real-gta-etobicoke-005', 43.6280500, -79.5258468),
    ('real-gta-etobicoke-006', 43.6270106, -79.5259178),
    ('real-gta-etobicoke-007', 43.6229455, -79.5403772),
    ('real-gta-etobicoke-008', 43.6130995, -79.4986233),
    ('real-gta-etobicoke-009', 43.6127489, -79.4974533),
    ('real-gta-brampton-001', 43.6890534, -79.7294474)
)
UPDATE stores s
SET
  lat = c.lat,
  lng = c.lng,
  updated_at = now()
FROM coordinates c
WHERE s.google_place_id = c.google_place_id
  AND (s.lat IS NULL OR s.lng IS NULL);
