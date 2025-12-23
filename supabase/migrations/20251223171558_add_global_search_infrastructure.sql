/*
  # Global Search Infrastructure

  1. New Tables
    - `search_analytics` - Tracks search queries, clicks, and performance
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `company_id` (uuid, references companies)
      - `query` (text) - The search query
      - `result_type` (text) - Type of result clicked (lead, user, agent, etc.)
      - `result_id` (uuid) - ID of the clicked result
      - `results_count` (integer) - Number of results returned
      - `time_to_click_ms` (integer) - Time from search to click
      - `created_at` (timestamptz)
    
    - `recent_searches` - Stores recent searches per user
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `query` (text) - The search query
      - `created_at` (timestamptz)

  2. Indexes
    - Full-text search indexes on leads (name, email, mobile, notes)
    - Full-text search indexes on users (name, email, phone)
    - Full-text search indexes on agents (name, personality, greeting)
    - Full-text search indexes on calls (transcript, summary)
    - Full-text search indexes on companies (name)

  3. Security
    - Enable RLS on new tables
    - Users can only access their own search history and analytics
*/

-- Create search_analytics table
CREATE TABLE IF NOT EXISTS search_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  query text NOT NULL,
  result_type text,
  result_id uuid,
  results_count integer DEFAULT 0,
  time_to_click_ms integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own search analytics"
  ON search_analytics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own search analytics"
  ON search_analytics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all search analytics"
  ON search_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.company_id = search_analytics.company_id
    )
  );

-- Create recent_searches table
CREATE TABLE IF NOT EXISTS recent_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, query)
);

ALTER TABLE recent_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recent searches"
  ON recent_searches FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for full-text search on leads
CREATE INDEX IF NOT EXISTS idx_leads_search ON leads USING gin(
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(mobile, '') || ' ' || coalesce(notes, ''))
);

-- Create indexes for full-text search on users
CREATE INDEX IF NOT EXISTS idx_users_search ON users USING gin(
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(phone, ''))
);

-- Create indexes for full-text search on agents
CREATE INDEX IF NOT EXISTS idx_agents_search ON agents USING gin(
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(personality, '') || ' ' || coalesce(greeting, ''))
);

-- Create indexes for full-text search on calls
CREATE INDEX IF NOT EXISTS idx_calls_search ON calls USING gin(
  to_tsvector('english', coalesce(transcript, '') || ' ' || coalesce(summary, ''))
);

-- Create indexes for full-text search on companies
CREATE INDEX IF NOT EXISTS idx_companies_search ON companies USING gin(
  to_tsvector('english', coalesce(name, ''))
);

-- Additional indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_leads_name ON leads(name);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_mobile ON leads(mobile);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name);
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_searches_user ON recent_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_searches_created ON recent_searches(created_at DESC);

-- Function to limit recent searches per user (keep only last 10)
CREATE OR REPLACE FUNCTION limit_recent_searches()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM recent_searches
  WHERE user_id = NEW.user_id
  AND id NOT IN (
    SELECT id FROM recent_searches
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 10
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_limit_recent_searches ON recent_searches;

CREATE TRIGGER trigger_limit_recent_searches
  AFTER INSERT ON recent_searches
  FOR EACH ROW
  EXECUTE FUNCTION limit_recent_searches();