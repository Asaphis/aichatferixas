-- Insert admin user with bcrypt hashed password
-- Hash generated with bcrypt cost factor 10
INSERT INTO users (name, email, password, role)
VALUES (
  'Asaphis',
  'asaphis.org@gmail.com',
  '$2a$10$aJrRqMOtKfSjnNBZCnAbIOjUJTGpqvORJUCjiln77yctCVSxw9WSW',
  'admin'
) ON CONFLICT (email) DO NOTHING;
