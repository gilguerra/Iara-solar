-- Add Clerk user ID to tenants so we can link portal users to DB tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS clerk_user_id VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS email         VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone         VARCHAR(50),
  ADD COLUMN IF NOT EXISTS cnpj          VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_tenants_clerk_user_id ON tenants(clerk_user_id);
