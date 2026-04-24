-- ============================================
-- V36__replace_with_real_gta_mechanic_shops.sql
-- Replace demo seed stores with real GTA mechanic shops
-- ============================================

-- Remove only demo seed stores so existing user-created or imported stores survive.
DELETE FROM stores
WHERE google_place_id LIKE 'demo-%';

INSERT INTO stores (
    google_place_id,
    name,
    address,
    city,
    state,
    postal_code,
    country,
    rating,
    rating_count,
    services_text,
    approval_status
) VALUES
('real-gta-northyork-001', 'Assured Automotive', '6167 Yonge St', 'North York', 'ON', 'M2M 3X2', 'Canada', 4.5, 120, 'General auto repair, diagnostics, oil change', 'APPROVED'),
('real-gta-thornhill-001', 'Toronto Mobile Mechanic Inc.', '7171 Yonge St', 'Thornhill', 'ON', 'L3T 0C5', 'Canada', 4.6, 95, 'Mobile mechanic services, diagnostics, battery replacement', 'APPROVED'),
('real-gta-northyork-002', 'BATHURST CAR CARE', '5901 Bathurst St', 'North York', 'ON', 'M2R 1Y7', 'Canada', 4.4, 88, 'General auto repair, maintenance, oil change', 'APPROVED'),
('real-gta-northyork-003', 'Abel''s Mobile Mechanic Service', '145 Churchill Ave', 'North York', 'ON', 'M2N 1Z3', 'Canada', 4.7, 60, 'Mobile mechanic services, diagnostics', 'APPROVED'),
('real-gta-northyork-004', 'Blankenship Shop', '3 Athabaska Ave', 'North York', 'ON', 'M2M 2T6', 'Canada', 4.3, 45, 'General auto repair, mechanical inspection', 'APPROVED'),
('real-gta-northyork-005', 'Paiman Auto Glass', '3181 Bayview Ave', 'North York', 'ON', 'M2K 2Y2', 'Canada', 4.5, 70, 'Auto glass repair', 'APPROVED'),
('real-gta-northyork-006', 'OB''S Mobile Car Tinting', '6021 Yonge St', 'North York', 'ON', 'M2M 3W2', 'Canada', 4.4, 55, 'Window tinting', 'APPROVED'),
('real-gta-northyork-007', 'DOGO AUTO', '93 Finch Ave E', 'North York', 'ON', 'M2N 4R4', 'Canada', 4.6, 73, 'General auto repair, diagnostics', 'APPROVED'),
('real-gta-northyork-008', 'Rambo Car Care', '4841 Yonge St', 'North York', 'ON', 'M2N 5X2', 'Canada', 4.5, 82, 'General auto repair, oil change', 'APPROVED'),
('real-gta-northyork-009', 'Location Tire Mobile Services', '33 Sheppard Ave E', 'North York', 'ON', 'M2N 7K1', 'Canada', 4.4, 50, 'Tire service, tire rotation, mobile mechanic services', 'APPROVED'),
('real-gta-etobicoke-001', 'Islington Village Automotive', '79 Shorncliffe Rd', 'Etobicoke', 'ON', 'M8Z 5K3', 'Canada', 4.5, 77, 'General auto repair, maintenance, oil change', 'APPROVED'),
('real-gta-etobicoke-002', 'Simplicity Car Care Etobicoke', '87 Shorncliffe Rd', 'Etobicoke', 'ON', 'M8Z 5K3', 'Canada', 4.6, 84, 'Collision repair, paint work', 'APPROVED'),
('real-gta-etobicoke-003', 'Technik Auto Service Etobicoke', '48 Six Point Rd', 'Etobicoke', 'ON', 'M8Z 2X3', 'Canada', 4.7, 66, 'General auto repair, diagnostics', 'APPROVED'),
('real-gta-etobicoke-004', 'Cochrane Automotive', '73 Chauncey Ave', 'Etobicoke', 'ON', 'M8Z 2Z2', 'Canada', 4.4, 54, 'General auto repair, brake service', 'APPROVED'),
('real-gta-etobicoke-005', 'Superior Automotive', '16 Goodrich Rd', 'Etobicoke', 'ON', 'M8Z 2H1', 'Canada', 4.5, 61, 'General auto repair, oil change', 'APPROVED'),
('real-gta-etobicoke-006', 'Master Mechanic Etobicoke', '32 Jutland Rd', 'Etobicoke', 'ON', 'M8Z 2G9', 'Canada', 4.6, 92, 'General auto repair, diagnostics, brake service', 'APPROVED'),
('real-gta-etobicoke-007', 'S Force Auto Repair', '66 N Queen St', 'Etobicoke', 'ON', 'M8Z 2C4', 'Canada', 4.3, 40, 'General auto repair, battery replacement', 'APPROVED'),
('real-gta-etobicoke-008', 'Alps Auto Repair Inc', '14 Drummond St', 'Etobicoke', 'ON', 'M8V 1Y8', 'Canada', 4.5, 58, 'General auto repair, diagnostics', 'APPROVED'),
('real-gta-etobicoke-009', 'Nelson''s Certified Auto Repair', '226 Royal York Rd', 'Etobicoke', 'ON', 'M8V 2A7', 'Canada', 4.6, 75, 'General auto repair, mechanical inspection', 'APPROVED'),
('real-gta-brampton-001', 'Empire Autobody Repair & Painting Inc.', '181 Rutherford Rd S #5', 'Brampton', 'ON', 'L6W 3P4', 'Canada', 4.6, 90, 'Collision repair, paint work', 'APPROVED')
ON CONFLICT (google_place_id) DO UPDATE
SET
    name = excluded.name,
    address = excluded.address,
    city = excluded.city,
    state = excluded.state,
    postal_code = excluded.postal_code,
    country = excluded.country,
    rating = excluded.rating,
    rating_count = excluded.rating_count,
    services_text = excluded.services_text,
    approval_status = excluded.approval_status,
    updated_at = now();
