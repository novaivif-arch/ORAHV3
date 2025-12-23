/*
  # Role-Based Access Control (RBAC) System

  1. Schema Updates
    - `companies` - Add subscription fields
      - `subscription_tier` (enum: free, basic, pro, enterprise)
      - `subscription_status` (enum: active, suspended, cancelled)
      - `max_users` (integer)
      - `expires_at` (timestamptz)
    
    - `users` - Add RBAC fields
      - `role` updated to support (super_admin, admin, user)
      - `is_active` (boolean)
    
    - `leads` - Add assignment
      - `assigned_user_id` (uuid, references users)

  2. New Tables
    - `permissions` - Granular user permissions
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `can_view_analytics` (boolean)
      - `can_make_calls` (boolean)
      - `can_export_data` (boolean)
      - `can_manage_leads` (boolean)
      - `can_view_all_leads` (boolean)
      - `created_at`, `updated_at`

    - `audit_logs` - Security audit trail
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `company_id` (uuid)
      - `action` (text)
      - `resource` (text)
      - `resource_id` (uuid)
      - `details` (jsonb)
      - `ip_address` (text)
      - `user_agent` (text)
      - `created_at` (timestamptz)

  3. Security
    - RLS policies for role-based access
    - Super admin can see everything
    - Admin can manage their company
    - Users see only assigned resources
*/

-- Add subscription fields to companies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE companies ADD COLUMN subscription_tier text DEFAULT 'free'
      CHECK (subscription_tier IN ('free', 'basic', 'pro', 'enterprise'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE companies ADD COLUMN subscription_status text DEFAULT 'active'
      CHECK (subscription_status IN ('active', 'suspended', 'cancelled'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'max_users'
  ) THEN
    ALTER TABLE companies ADD COLUMN max_users integer DEFAULT 5;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE companies ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

-- Update users role check to include super_admin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('super_admin', 'admin', 'member', 'user'));

-- Add is_active to users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE users ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- Add assigned_user_id to leads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'assigned_user_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN assigned_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_view_analytics boolean DEFAULT false,
  can_make_calls boolean DEFAULT true,
  can_export_data boolean DEFAULT false,
  can_manage_leads boolean DEFAULT false,
  can_view_all_leads boolean DEFAULT false,
  can_edit_leads boolean DEFAULT true,
  can_delete_leads boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Permissions RLS policies
CREATE POLICY "Super admins can manage all permissions"
  ON permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Admins can manage company user permissions"
  ON permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin
      JOIN users target ON target.id = permissions.user_id
      WHERE admin.id = auth.uid()
      AND admin.role = 'admin'
      AND admin.company_id = target.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users admin
      JOIN users target ON target.id = permissions.user_id
      WHERE admin.id = auth.uid()
      AND admin.role = 'admin'
      AND admin.company_id = target.company_id
    )
  );

CREATE POLICY "Users can view own permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource text NOT NULL,
  resource_id uuid,
  details jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs RLS policies
CREATE POLICY "Super admins can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Admins can view company audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.company_id = audit_logs.company_id
    )
  );

CREATE POLICY "Anyone can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Create indexes for permissions
CREATE INDEX IF NOT EXISTS idx_permissions_user ON permissions(user_id);

-- Create index for lead assignment
CREATE INDEX IF NOT EXISTS idx_leads_assigned_user ON leads(assigned_user_id);

-- Update leads RLS to support role-based access
DROP POLICY IF EXISTS "Users can view company leads" ON leads;
DROP POLICY IF EXISTS "Users can insert company leads" ON leads;
DROP POLICY IF EXISTS "Users can update company leads" ON leads;
DROP POLICY IF EXISTS "Users can delete company leads" ON leads;

CREATE POLICY "Super admins can view all leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Admins can view company leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.company_id = leads.company_id
    )
  );

CREATE POLICY "Users can view assigned or permitted leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      LEFT JOIN permissions ON permissions.user_id = users.id
      WHERE users.id = auth.uid()
      AND users.role IN ('member', 'user')
      AND users.company_id = leads.company_id
      AND (
        leads.assigned_user_id = auth.uid()
        OR permissions.can_view_all_leads = true
      )
    )
  );

CREATE POLICY "Admins can insert company leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
      AND (users.role = 'super_admin' OR users.company_id = leads.company_id)
    )
  );

CREATE POLICY "Users with permission can insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      JOIN permissions ON permissions.user_id = users.id
      WHERE users.id = auth.uid()
      AND users.company_id = leads.company_id
      AND permissions.can_manage_leads = true
    )
  );

CREATE POLICY "Admins can update company leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
      AND (users.role = 'super_admin' OR users.company_id = leads.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
      AND (users.role = 'super_admin' OR users.company_id = leads.company_id)
    )
  );

CREATE POLICY "Users can update assigned leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    leads.assigned_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      LEFT JOIN permissions ON permissions.user_id = users.id
      WHERE users.id = auth.uid()
      AND (permissions.can_edit_leads = true OR permissions.can_edit_leads IS NULL)
    )
  )
  WITH CHECK (
    leads.assigned_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      LEFT JOIN permissions ON permissions.user_id = users.id
      WHERE users.id = auth.uid()
      AND (permissions.can_edit_leads = true OR permissions.can_edit_leads IS NULL)
    )
  );

CREATE POLICY "Admins can delete company leads"
  ON leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
      AND (users.role = 'super_admin' OR users.company_id = leads.company_id)
    )
  );

-- Update users RLS for role-based access
DROP POLICY IF EXISTS "Users can view company users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Super admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

CREATE POLICY "Admins can view company users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin
      WHERE admin.id = auth.uid()
      AND admin.role = 'admin'
      AND admin.company_id = users.company_id
    )
  );

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Super admins can manage all users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

CREATE POLICY "Admins can manage company users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users admin
      WHERE admin.id = auth.uid()
      AND admin.role = 'admin'
      AND admin.company_id = users.company_id
    )
    AND users.role IN ('member', 'user')
  );

CREATE POLICY "Admins can update company users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin
      WHERE admin.id = auth.uid()
      AND admin.role = 'admin'
      AND admin.company_id = users.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users admin
      WHERE admin.id = auth.uid()
      AND admin.role = 'admin'
      AND admin.company_id = users.company_id
    )
  );

CREATE POLICY "Users can update own basic info"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Update companies RLS
DROP POLICY IF EXISTS "Users can view own company" ON companies;

CREATE POLICY "Super admins can manage all companies"
  ON companies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Company members can view own company"
  ON companies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = companies.id
    )
  );

CREATE POLICY "Admins can update own company"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.company_id = companies.id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.company_id = companies.id
    )
  );

-- Function to auto-create permissions for new users
CREATE OR REPLACE FUNCTION create_default_permissions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IN ('member', 'user') THEN
    INSERT INTO permissions (user_id, can_view_analytics, can_make_calls, can_export_data, can_manage_leads, can_view_all_leads)
    VALUES (NEW.id, false, true, false, false, false)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_create_default_permissions ON users;

CREATE TRIGGER trigger_create_default_permissions
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_permissions();