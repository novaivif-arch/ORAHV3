/*
  # Notifications System

  1. New Tables
    - `notifications` - User notifications
    - `user_settings` - User preferences
    - `integrations` - Third-party integrations
    - `webhooks` - Webhook configurations

  2. Security
    - RLS policies for user/company access
*/

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read boolean DEFAULT false,
  action_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  email_notifications boolean DEFAULT true,
  call_summaries boolean DEFAULT true,
  weekly_reports boolean DEFAULT false,
  marketing_updates boolean DEFAULT false,
  two_factor_enabled boolean DEFAULT false,
  theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
  language text DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
CREATE POLICY "Users can manage own settings"
  ON user_settings FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Integrations table
CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('crm', 'calendar', 'communication', 'analytics', 'storage')),
  status text DEFAULT 'available' CHECK (status IN ('connected', 'available', 'coming_soon', 'disconnected')),
  config jsonb DEFAULT '{}',
  api_key text,
  connected_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, name)
);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can view integrations" ON integrations;
CREATE POLICY "Company members can view integrations"
  ON integrations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'super_admin' OR users.company_id = integrations.company_id)
    )
  );

DROP POLICY IF EXISTS "Admins can manage integrations" ON integrations;
CREATE POLICY "Admins can manage integrations"
  ON integrations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
      AND (users.role = 'super_admin' OR users.company_id = integrations.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
      AND (users.role = 'super_admin' OR users.company_id = integrations.company_id)
    )
  );

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('lead_created', 'lead_updated', 'call_completed', 'lead_status_changed')),
  url text NOT NULL,
  is_active boolean DEFAULT true,
  secret text,
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, event_type)
);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage webhooks" ON webhooks;
CREATE POLICY "Admins can manage webhooks"
  ON webhooks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
      AND (users.role = 'super_admin' OR users.company_id = webhooks.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
      AND (users.role = 'super_admin' OR users.company_id = webhooks.company_id)
    )
  );

-- Add missing columns to api_keys if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'name'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN name text NOT NULL DEFAULT 'Default Key';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'key_hash'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN key_hash text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'key_prefix'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN key_prefix text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN is_active boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN created_by uuid REFERENCES users(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage API keys" ON api_keys;
CREATE POLICY "Admins can manage API keys"
  ON api_keys FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
      AND (users.role = 'super_admin' OR users.company_id = api_keys.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
      AND (users.role = 'super_admin' OR users.company_id = api_keys.company_id)
    )
  );