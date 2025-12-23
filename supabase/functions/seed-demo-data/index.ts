import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DemoUser {
  email: string;
  password: string;
  name: string;
  role: 'super_admin' | 'admin' | 'user';
  companyName?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await req.json().catch(() => ({}));
    const seedKey = body.seedKey;

    if (seedKey !== 'SEED_DEMO_2024') {
      return new Response(
        JSON.stringify({ error: 'Invalid seed key' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: { created: string[], skipped: string[], errors: string[] } = {
      created: [],
      skipped: [],
      errors: []
    };

    const { data: existingCompanies } = await supabase
      .from('companies')
      .select('name')
      .in('name', ['System', 'Acme Corp', 'TechStart Inc']);

    const existingCompanyNames = new Set(existingCompanies?.map(c => c.name) || []);

    const companies: { name: string, tier: string, status: string, maxUsers: number }[] = [
      { name: 'System', tier: 'enterprise', status: 'active', maxUsers: 1 },
      { name: 'Acme Corp', tier: 'pro', status: 'active', maxUsers: 10 },
      { name: 'TechStart Inc', tier: 'basic', status: 'active', maxUsers: 5 },
    ];

    const companyIds: Record<string, string> = {};

    for (const company of companies) {
      if (existingCompanyNames.has(company.name)) {
        const { data } = await supabase
          .from('companies')
          .select('id')
          .eq('name', company.name)
          .single();
        if (data) companyIds[company.name] = data.id;
        results.skipped.push(`Company: ${company.name}`);
        continue;
      }

      const { data, error } = await supabase
        .from('companies')
        .insert({
          name: company.name,
          subscription_tier: company.tier,
          subscription_status: company.status,
          max_users: company.maxUsers,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) {
        results.errors.push(`Company ${company.name}: ${error.message}`);
      } else if (data) {
        companyIds[company.name] = data.id;
        results.created.push(`Company: ${company.name}`);
      }
    }

    const demoUsers: DemoUser[] = [
      { email: 'superadmin@system.com', password: 'SuperSecure123!', name: 'Super Admin', role: 'super_admin', companyName: 'System' },
      { email: 'admin@acme.com', password: 'AcmeAdmin123!', name: 'John Admin', role: 'admin', companyName: 'Acme Corp' },
      { email: 'user1@acme.com', password: 'User123!', name: 'Alice User', role: 'user', companyName: 'Acme Corp' },
      { email: 'user2@acme.com', password: 'User123!', name: 'Bob User', role: 'user', companyName: 'Acme Corp' },
      { email: 'admin@techstart.com', password: 'TechAdmin123!', name: 'Sarah Admin', role: 'admin', companyName: 'TechStart Inc' },
      { email: 'user1@techstart.com', password: 'User123!', name: 'Charlie User', role: 'user', companyName: 'TechStart Inc' },
    ];

    for (const user of demoUsers) {
      const { data: existingUsers } = await supabase
        .from('users')
        .select('email')
        .eq('email', user.email);

      if (existingUsers && existingUsers.length > 0) {
        results.skipped.push(`User: ${user.email}`);
        continue;
      }

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

      if (authError) {
        if (authError.message.includes('already been registered')) {
          results.skipped.push(`User: ${user.email}`);
        } else {
          results.errors.push(`User ${user.email}: ${authError.message}`);
        }
        continue;
      }

      if (!authData.user) {
        results.errors.push(`User ${user.email}: No user data returned`);
        continue;
      }

      const companyId = user.companyName ? companyIds[user.companyName] : null;

      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          company_id: companyId,
          is_active: true,
        });

      if (profileError) {
        results.errors.push(`User profile ${user.email}: ${profileError.message}`);
      } else {
        results.created.push(`User: ${user.email} (${user.role})`);

        if (user.role === 'user') {
          await supabase.from('permissions').insert({
            user_id: authData.user.id,
            can_view_analytics: false,
            can_make_calls: true,
            can_export_data: false,
            can_manage_leads: false,
            can_view_all_leads: false,
            can_edit_leads: true,
            can_delete_leads: false,
          });
        }
      }
    }

    const acmeCompanyId = companyIds['Acme Corp'];
    const techStartCompanyId = companyIds['TechStart Inc'];

    if (acmeCompanyId) {
      const { data: acmeUsers } = await supabase
        .from('users')
        .select('id')
        .eq('company_id', acmeCompanyId)
        .eq('role', 'user');

      const acmeUserIds = acmeUsers?.map(u => u.id) || [];

      const acmeLeads = [
        { name: 'Michael Johnson', mobile: '+1-555-0101', email: 'michael@example.com', status: 'new', source: 'website' },
        { name: 'Emily Davis', mobile: '+1-555-0102', email: 'emily@example.com', status: 'contacted', source: 'referral' },
        { name: 'David Wilson', mobile: '+1-555-0103', email: 'david@example.com', status: 'qualified', source: 'linkedin' },
        { name: 'Jessica Brown', mobile: '+1-555-0104', email: 'jessica@example.com', status: 'new', source: 'website' },
        { name: 'Chris Martinez', mobile: '+1-555-0105', email: 'chris@example.com', status: 'converted', source: 'cold_call' },
      ];

      for (let i = 0; i < acmeLeads.length; i++) {
        const lead = acmeLeads[i];
        const assignedUserId = acmeUserIds.length > 0 ? acmeUserIds[i % acmeUserIds.length] : null;

        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .eq('company_id', acmeCompanyId)
          .eq('email', lead.email)
          .maybeSingle();

        if (!existingLead) {
          await supabase.from('leads').insert({
            ...lead,
            company_id: acmeCompanyId,
            assigned_user_id: assignedUserId,
          });
          results.created.push(`Lead: ${lead.name}`);
        } else {
          results.skipped.push(`Lead: ${lead.name}`);
        }
      }
    }

    if (techStartCompanyId) {
      const { data: techUsers } = await supabase
        .from('users')
        .select('id')
        .eq('company_id', techStartCompanyId)
        .eq('role', 'user');

      const techUserIds = techUsers?.map(u => u.id) || [];

      const techLeads = [
        { name: 'Amanda Lee', mobile: '+1-555-0201', email: 'amanda@example.com', status: 'new', source: 'website' },
        { name: 'Ryan Thompson', mobile: '+1-555-0202', email: 'ryan@example.com', status: 'contacted', source: 'trade_show' },
        { name: 'Nicole Garcia', mobile: '+1-555-0203', email: 'nicole@example.com', status: 'qualified', source: 'referral' },
      ];

      for (let i = 0; i < techLeads.length; i++) {
        const lead = techLeads[i];
        const assignedUserId = techUserIds.length > 0 ? techUserIds[i % techUserIds.length] : null;

        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .eq('company_id', techStartCompanyId)
          .eq('email', lead.email)
          .maybeSingle();

        if (!existingLead) {
          await supabase.from('leads').insert({
            ...lead,
            company_id: techStartCompanyId,
            assigned_user_id: assignedUserId,
          });
          results.created.push(`Lead: ${lead.name}`);
        } else {
          results.skipped.push(`Lead: ${lead.name}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        credentials: {
          superAdmin: { email: 'superadmin@system.com', password: 'SuperSecure123!' },
          acmeAdmin: { email: 'admin@acme.com', password: 'AcmeAdmin123!' },
          acmeUser1: { email: 'user1@acme.com', password: 'User123!' },
          acmeUser2: { email: 'user2@acme.com', password: 'User123!' },
          techStartAdmin: { email: 'admin@techstart.com', password: 'TechAdmin123!' },
          techStartUser: { email: 'user1@techstart.com', password: 'User123!' },
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Seed error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});