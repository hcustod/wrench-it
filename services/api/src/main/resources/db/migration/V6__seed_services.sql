INSERT INTO services (name, description, category)
VALUES
('Oil Change', 'Engine oil and filter replacement', 'Maintenance'),
('Tire Rotation', 'Rotate tires to extend tire life', 'Maintenance'),
('Brake Pads Replacement', 'Replace worn brake pads', 'Brakes'),
('Battery Replacement', 'Test and replace car battery', 'Electrical')
ON CONFLICT (name) DO NOTHING;
