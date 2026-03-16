-- Update existing admin user to super_admin role
UPDATE users 
SET role = 'super_admin' 
WHERE email = 'asaphis.org@gmail.com';
