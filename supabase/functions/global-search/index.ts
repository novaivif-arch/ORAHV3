import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  redirectUrl: string;
  priorityScore: number;
  metadata?: Record<string, unknown>;
}

interface SearchRequest {
  query: string;
  filters?: string[];
  limit?: number;
}

function detectQueryIntent(query: string): string[] {
  const intents: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[+]?[\d\s()-]{7,}$/;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const urlRegex = /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})/i;

  if (emailRegex.test(query.trim())) {
    intents.push('email');
  }
  if (phoneRegex.test(query.replace(/\s/g, ''))) {
    intents.push('phone');
  }
  if (uuidRegex.test(query.trim())) {
    intents.push('id');
  }
  if (urlRegex.test(query.trim())) {
    intents.push('url');
  }
  if (intents.length === 0) {
    intents.push('text');
  }
  return intents;
}

function escapeSearchQuery(query: string): string {
  return query.replace(/[&|!():<>*\\"']/g, ' ').trim();
}

function createFuzzyPattern(query: string): string {
  const escaped = escapeSearchQuery(query);
  const words = escaped.split(/\s+/).filter(w => w.length > 0);
  return words.map(w => `${w}:*`).join(' & ');
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('id, company_id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (!userProfile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: SearchRequest = await req.json();
    const { query, filters = [], limit = 10 } = body;

    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ results: [], categories: {} }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const intents = detectQueryIntent(query);
    const searchPattern = `%${query.toLowerCase()}%`;
    const tsQuery = createFuzzyPattern(query);
    const results: SearchResult[] = [];
    const companyId = userProfile.company_id;
    const isAdmin = userProfile.role === 'admin';

    const searchLeads = async () => {
      if (filters.length > 0 && !filters.includes('leads')) return [];
      
      let queryBuilder = supabase
        .from('leads')
        .select('id, name, email, mobile, status, source')
        .eq('company_id', companyId)
        .limit(limit);

      if (intents.includes('email')) {
        queryBuilder = queryBuilder.ilike('email', searchPattern);
      } else if (intents.includes('phone')) {
        queryBuilder = queryBuilder.ilike('mobile', searchPattern);
      } else {
        queryBuilder = queryBuilder.or(
          `name.ilike.${searchPattern},email.ilike.${searchPattern},mobile.ilike.${searchPattern}`
        );
      }

      const { data, error } = await queryBuilder;
      if (error) {
        console.error('Leads search error:', error);
        return [];
      }

      return (data || []).map((lead, idx) => ({
        id: lead.id,
        type: 'lead',
        title: lead.name || 'Unknown Lead',
        subtitle: lead.email || lead.mobile || lead.status,
        redirectUrl: `/leads/${lead.id}`,
        priorityScore: 100 - idx,
        metadata: { status: lead.status, source: lead.source }
      }));
    };

    const searchUsers = async () => {
      if (filters.length > 0 && !filters.includes('users')) return [];
      if (!isAdmin) return [];

      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, phone, role')
        .eq('company_id', companyId)
        .or(`name.ilike.${searchPattern},email.ilike.${searchPattern}`)
        .limit(limit);

      if (error) {
        console.error('Users search error:', error);
        return [];
      }

      return (data || []).map((u, idx) => ({
        id: u.id,
        type: 'user',
        title: u.name || 'Unknown User',
        subtitle: u.email || u.role,
        redirectUrl: `/settings`,
        priorityScore: 80 - idx,
        metadata: { role: u.role }
      }));
    };

    const searchAgents = async () => {
      if (filters.length > 0 && !filters.includes('agents')) return [];

      const { data, error } = await supabase
        .from('agents')
        .select('id, name, voice, tone, is_active')
        .eq('company_id', companyId)
        .ilike('name', searchPattern)
        .limit(limit);

      if (error) {
        console.error('Agents search error:', error);
        return [];
      }

      return (data || []).map((agent, idx) => ({
        id: agent.id,
        type: 'agent',
        title: agent.name,
        subtitle: `${agent.voice} voice - ${agent.is_active ? 'Active' : 'Inactive'}`,
        redirectUrl: `/agents`,
        priorityScore: 70 - idx,
        metadata: { voice: agent.voice, isActive: agent.is_active }
      }));
    };

    const searchCalls = async () => {
      if (filters.length > 0 && !filters.includes('calls')) return [];

      const { data, error } = await supabase
        .from('calls')
        .select(`
          id, 
          status, 
          duration, 
          summary,
          created_at,
          leads!inner(id, name)
        `)
        .eq('company_id', companyId)
        .or(`summary.ilike.${searchPattern}`)
        .limit(limit);

      if (error) {
        console.error('Calls search error:', error);
        return [];
      }

      return (data || []).map((call, idx) => ({
        id: call.id,
        type: 'call',
        title: `Call with ${(call.leads as { name: string })?.name || 'Unknown'}`,
        subtitle: call.summary?.substring(0, 50) || call.status,
        redirectUrl: `/call-analytics`,
        priorityScore: 60 - idx,
        metadata: { status: call.status, duration: call.duration }
      }));
    };

    const searchSettings = () => {
      if (filters.length > 0 && !filters.includes('settings')) return [];

      const settingsItems = [
        { id: 'profile', title: 'Profile Settings', subtitle: 'Manage your profile', url: '/settings' },
        { id: 'notifications', title: 'Notification Settings', subtitle: 'Configure alerts', url: '/settings' },
        { id: 'integrations', title: 'Integrations', subtitle: 'Connect external services', url: '/integrations' },
        { id: 'api-keys', title: 'API Keys', subtitle: 'Manage API credentials', url: '/settings' },
        { id: 'company', title: 'Company Settings', subtitle: 'Organization preferences', url: '/settings' },
      ];

      const lowerQuery = query.toLowerCase();
      return settingsItems
        .filter(item => 
          item.title.toLowerCase().includes(lowerQuery) || 
          item.subtitle.toLowerCase().includes(lowerQuery)
        )
        .map((item, idx) => ({
          id: item.id,
          type: 'setting',
          title: item.title,
          subtitle: item.subtitle,
          redirectUrl: item.url,
          priorityScore: 50 - idx
        }));
    };

    const searchNavigation = () => {
      const navItems = [
        { id: 'dashboard', title: 'Dashboard', subtitle: 'Overview & stats', url: '/dashboard', keywords: ['home', 'overview', 'stats', 'metrics'] },
        { id: 'leads', title: 'Leads', subtitle: 'Manage leads', url: '/leads', keywords: ['contacts', 'prospects', 'customers'] },
        { id: 'analytics', title: 'Analytics', subtitle: 'Charts & insights', url: '/analytics', keywords: ['reports', 'data', 'charts', 'graphs'] },
        { id: 'call-analytics', title: 'Call Analytics', subtitle: 'Call metrics', url: '/call-analytics', keywords: ['calls', 'phone', 'conversations'] },
        { id: 'agents', title: 'Agents', subtitle: 'AI voice agents', url: '/agents', keywords: ['ai', 'voice', 'bots', 'assistants'] },
        { id: 'integrations', title: 'Integrations', subtitle: 'Connect apps', url: '/integrations', keywords: ['connect', 'apps', 'services', 'api'] },
        { id: 'settings', title: 'Settings', subtitle: 'Preferences', url: '/settings', keywords: ['config', 'preferences', 'account'] },
      ];

      const lowerQuery = query.toLowerCase();
      return navItems
        .filter(item => 
          item.title.toLowerCase().includes(lowerQuery) || 
          item.subtitle.toLowerCase().includes(lowerQuery) ||
          item.keywords.some(k => k.includes(lowerQuery))
        )
        .map((item, idx) => ({
          id: item.id,
          type: 'navigation',
          title: item.title,
          subtitle: item.subtitle,
          redirectUrl: item.url,
          priorityScore: 90 - idx
        }));
    };

    const [leadsResults, usersResults, agentsResults, callsResults] = await Promise.all([
      searchLeads(),
      searchUsers(),
      searchAgents(),
      searchCalls()
    ]);

    const settingsResults = searchSettings();
    const navigationResults = searchNavigation();

    results.push(
      ...leadsResults,
      ...usersResults,
      ...agentsResults,
      ...callsResults,
      ...settingsResults,
      ...navigationResults
    );

    results.sort((a, b) => b.priorityScore - a.priorityScore);

    const categories: Record<string, SearchResult[]> = {};
    for (const result of results) {
      if (!categories[result.type]) {
        categories[result.type] = [];
      }
      categories[result.type].push(result);
    }

    await supabase.from('recent_searches').upsert(
      { user_id: user.id, query: query.trim(), created_at: new Date().toISOString() },
      { onConflict: 'user_id,query' }
    );

    return new Response(
      JSON.stringify({
        results: results.slice(0, limit),
        categories,
        totalCount: results.length,
        query,
        intents
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});