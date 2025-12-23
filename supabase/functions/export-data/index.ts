import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonToCSV(data: Record<string, unknown>[], columns?: string[]): string {
  if (!data || data.length === 0) return '';
  
  const headers = columns || Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string') {
        return `"${val.replace(/"/g, '""')}"`;
      }
      if (typeof val === 'object') {
        return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      }
      return String(val);
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
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

    if (!['super_admin', 'admin'].includes(userProfile.role)) {
      const { data: permissions } = await supabase
        .from('permissions')
        .select('can_export_data')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!permissions?.can_export_data) {
        return new Response(
          JSON.stringify({ error: 'Export permission denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const body = await req.json();
    const { type, format = 'csv', filters = {} } = body;

    let data: Record<string, unknown>[] = [];
    let filename = '';
    let columns: string[] = [];

    switch (type) {
      case 'leads': {
        let query = supabase
          .from('leads')
          .select('id, name, email, mobile, status, source, created_at, updated_at');
        
        if (userProfile.role !== 'super_admin') {
          query = query.eq('company_id', userProfile.company_id);
        }
        
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.source) {
          query = query.eq('source', filters.source);
        }
        if (filters.startDate) {
          query = query.gte('created_at', filters.startDate);
        }
        if (filters.endDate) {
          query = query.lte('created_at', filters.endDate);
        }

        const { data: leads, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        data = leads || [];
        filename = `leads_export_${new Date().toISOString().split('T')[0]}`;
        columns = ['id', 'name', 'email', 'mobile', 'status', 'source', 'created_at', 'updated_at'];
        break;
      }

      case 'users': {
        if (!['super_admin', 'admin'].includes(userProfile.role)) {
          return new Response(
            JSON.stringify({ error: 'Only admins can export users' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        let query = supabase
          .from('users')
          .select('id, name, email, phone, role, is_active, created_at');
        
        if (userProfile.role !== 'super_admin') {
          query = query.eq('company_id', userProfile.company_id);
        }

        const { data: users, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        data = users || [];
        filename = `users_export_${new Date().toISOString().split('T')[0]}`;
        columns = ['id', 'name', 'email', 'phone', 'role', 'is_active', 'created_at'];
        break;
      }

      case 'companies': {
        if (userProfile.role !== 'super_admin') {
          return new Response(
            JSON.stringify({ error: 'Only super admins can export companies' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: companies, error } = await supabase
          .from('companies')
          .select('id, name, subscription_tier, subscription_status, max_users, created_at')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        data = companies || [];
        filename = `companies_export_${new Date().toISOString().split('T')[0]}`;
        columns = ['id', 'name', 'subscription_tier', 'subscription_status', 'max_users', 'created_at'];
        break;
      }

      case 'calls': {
        let query = supabase
          .from('calls')
          .select('id, lead_id, status, duration, sentiment, created_at');
        
        if (userProfile.role !== 'super_admin') {
          query = query.eq('company_id', userProfile.company_id);
        }

        const { data: calls, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        data = calls || [];
        filename = `calls_export_${new Date().toISOString().split('T')[0]}`;
        columns = ['id', 'lead_id', 'status', 'duration', 'sentiment', 'created_at'];
        break;
      }

      case 'analytics': {
        let leadsQuery = supabase
          .from('leads')
          .select('status, source, created_at');
        
        if (userProfile.role !== 'super_admin') {
          leadsQuery = leadsQuery.eq('company_id', userProfile.company_id);
        }

        const { data: leads } = await leadsQuery;
        
        const statusCounts: Record<string, number> = {};
        const sourceCounts: Record<string, number> = {};
        
        (leads || []).forEach(lead => {
          statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
          if (lead.source) {
            sourceCounts[lead.source] = (sourceCounts[lead.source] || 0) + 1;
          }
        });

        const analyticsData = [
          ...Object.entries(statusCounts).map(([status, count]) => ({ metric: 'Lead Status', value: status, count })),
          ...Object.entries(sourceCounts).map(([source, count]) => ({ metric: 'Lead Source', value: source, count })),
        ];

        data = analyticsData;
        filename = `analytics_export_${new Date().toISOString().split('T')[0]}`;
        columns = ['metric', 'value', 'count'];
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid export type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (format === 'csv') {
      const csv = jsonToCSV(data, columns);
      return new Response(csv, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    } else {
      return new Response(
        JSON.stringify({ data, filename }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});