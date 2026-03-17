-- Migration: Add user_id to existing tables for multi-tenant support
-- This script adds user_id columns to existing tables and assigns existing data to the first user

-- Add user_id to companies table (if not exists)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Add user_id to products table (if not exists)
ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Add user_id to contacts table (if not exists)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Add user_id to conversations table (if not exists)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Add user_id to settings table (if not exists)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Add user_id to quick_replies table (if not exists)
ALTER TABLE quick_replies ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Add user_id to faqs table (if not exists)
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Get the first user (admin) to assign existing data to
DO $$
DECLARE
  first_user_id INTEGER;
BEGIN
  -- Get the first user ID
  SELECT id INTO first_user_id FROM users ORDER BY id LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    -- Assign existing companies to first user
    UPDATE companies SET user_id = first_user_id WHERE user_id IS NULL;
    
    -- Assign existing products to first user
    UPDATE products SET user_id = first_user_id WHERE user_id IS NULL;
    
    -- Assign existing contacts to first user
    UPDATE contacts SET user_id = first_user_id WHERE user_id IS NULL;
    
    -- Assign existing conversations to first user
    UPDATE conversations SET user_id = first_user_id WHERE user_id IS NULL;
    
    -- Assign existing settings to first user (but keep global settings too)
    -- We'll handle this differently - make settings user-specific
    
    -- Assign existing quick_replies to first user
    UPDATE quick_replies SET user_id = first_user_id WHERE user_id IS NULL;
    
    -- Assign existing faqs to first user
    UPDATE faqs SET user_id = first_user_id WHERE user_id IS NULL;
    
    RAISE NOTICE 'Migration complete. All existing data assigned to user ID: %', first_user_id;
  ELSE
    RAISE WARNING 'No users found in database. Please create a user first.';
  END IF;
END $$;

-- Create indexes for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_replies_user_id ON quick_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_faqs_user_id ON faqs(user_id);
