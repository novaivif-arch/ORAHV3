import { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Users, CheckCircle2, XCircle, Phone, Clock, TrendingUp, ArrowRight, BarChart3, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../lib/database.types';
import { getTimeCategory } from '../lib/timeClassification';
import { useNavigate } from 'react-router-dom';

type Lead = Database['public']['Tables']['leads']['Row'];

interface DashboardData {
  totalLeads: number;
  successfulLeads: number;
  failedLeads: number;
  workingHoursLeads: number;
  nonWorkingHoursLeads: number;
  recentLeads: Lead[];
  totalCalls: number;
  completedCalls: number;
}

export function Dashboard() {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData>({
    totalLeads: 0,
    successfulLeads: 0,
    failedLeads: 0,
    workingHoursLeads: 0,
    nonWorkingHoursLeads: 0,
    recentLeads: [],
    totalCalls: 0,
    completedCalls: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return;

      if (!profile?.company_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const [leadsResult, callsResult] = await Promise.all([
          supabase
            .from('leads')
            .select('*')
            .eq('company_id', profile.company_id)
            .order('created_at', { ascending: false }),
          supabase
            .from('calls')
            .select('lead_id, success_evaluation, status')
            .eq('company_id', profile.company_id),
        ]);

        const leads = leadsResult.data || [];
        const calls = callsResult.data || [];

        const callsMap = new Map(
          calls.map(call => [call.lead_id, call])
        );

        const successfulLeads = leads.filter(lead => {
          const call = callsMap.get(lead.id);
          return call?.success_evaluation === true;
        }).length;

        const workingHoursLeads = leads.filter(lead =>
          getTimeCategory(lead.created_at) === 'Working Hours'
        ).length;

        setData({
          totalLeads: leads.length,
          successfulLeads,
          failedLeads: leads.length - successfulLeads,
          workingHoursLeads,
          nonWorkingHoursLeads: leads.length - workingHoursLeads,
          recentLeads: leads.slice(0, 5),
          totalCalls: calls.length,
          completedCalls: calls.filter(c => c.status === 'completed').length,
        });
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile?.company_id, authLoading]);

  const successRate = data.totalLeads > 0
    ? Math.round((data.successfulLeads / data.totalLeads) * 100)
    : 0;

  const kpis = [
    {
      title: 'Total Leads',
      value: data.totalLeads.toString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-gradient-to-br from-blue-500 to-blue-600',
      lightBg: 'bg-blue-50',
      trend: '+12%',
      trendUp: true,
    },
    {
      title: 'Successful Leads',
      value: data.successfulLeads.toString(),
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      lightBg: 'bg-emerald-50',
      trend: '+8%',
      trendUp: true,
    },
    {
      title: 'Failed/Nurture',
      value: data.failedLeads.toString(),
      icon: XCircle,
      color: 'text-rose-600',
      bgColor: 'bg-gradient-to-br from-rose-500 to-rose-600',
      lightBg: 'bg-rose-50',
      trend: '-5%',
      trendUp: false,
    },
    {
      title: 'Success Rate',
      value: `${successRate}%`,
      icon: TrendingUp,
      color: 'text-amber-600',
      bgColor: 'bg-gradient-to-br from-amber-500 to-amber-600',
      lightBg: 'bg-amber-50',
      trend: '+3%',
      trendUp: true,
    },
    {
      title: 'Total Calls',
      value: data.totalCalls.toString(),
      icon: Phone,
      color: 'text-cyan-600',
      bgColor: 'bg-gradient-to-br from-cyan-500 to-cyan-600',
      lightBg: 'bg-cyan-50',
      trend: '+15%',
      trendUp: true,
    },
    {
      title: 'Working Hours',
      value: data.workingHoursLeads.toString(),
      icon: Clock,
      color: 'text-teal-600',
      bgColor: 'bg-gradient-to-br from-teal-500 to-teal-600',
      lightBg: 'bg-teal-50',
      trend: '+7%',
      trendUp: true,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-500 mt-1">Welcome back! Here's your lead overview.</p>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={() => navigate('/leads')}
            className="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            View All Leads
          </button>
          <button
            onClick={() => navigate('/analytics')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25"
          >
            Analytics
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {kpis.map((kpi, index) => (
          <Card
            key={kpi.title}
            className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 shadow-lg overflow-hidden"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-500 mb-1">{kpi.title}</p>
                  <p className="text-3xl font-bold text-slate-900">{kpi.value}</p>
                  <div className={`flex items-center gap-1 mt-2 text-sm ${kpi.trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                    <TrendingUp className={`w-4 h-4 ${!kpi.trendUp ? 'rotate-180' : ''}`} />
                    <span className="font-medium">{kpi.trend}</span>
                    <span className="text-slate-400">vs last month</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${kpi.bgColor} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <kpi.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-lg">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Recent Leads</h3>
                <p className="text-sm text-slate-500">Latest activity from your leads</p>
              </div>
              <button
                onClick={() => navigate('/leads')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 group"
              >
                View all
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            {data.recentLeads.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-600 font-medium">No leads yet</p>
                <p className="text-sm text-slate-500 mt-1">Start by adding leads manually or syncing your data.</p>
                <button
                  onClick={() => navigate('/leads')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Your First Lead
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentLeads.map((lead, index) => (
                  <div
                    key={lead.id}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer transition-all duration-200 hover:shadow-md group"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {lead.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{lead.name}</p>
                        <p className="text-sm text-slate-500">{lead.mobile}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        lead.status === 'new' ? 'bg-blue-100 text-blue-700' :
                        lead.status === 'contacted' ? 'bg-amber-100 text-amber-700' :
                        lead.status === 'qualified' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {lead.status}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="border-0 shadow-lg">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Quick Stats</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span className="text-sm font-medium text-slate-700">Working Hours</span>
                  </div>
                  <span className="text-lg font-bold text-slate-900">{data.workingHoursLeads}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-cyan-600 rounded-full"></div>
                    <span className="text-sm font-medium text-slate-700">Non-Working Hours</span>
                  </div>
                  <span className="text-lg font-bold text-slate-900">{data.nonWorkingHoursLeads}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                    <span className="text-sm font-medium text-slate-700">Success Rate</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-600">{successRate}%</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-amber-600 rounded-full"></div>
                    <span className="text-sm font-medium text-slate-700">Calls Completed</span>
                  </div>
                  <span className="text-lg font-bold text-slate-900">{data.completedCalls}</span>
                </div>
              </div>
            </div>
          </Card>

          {data.totalLeads > 0 && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
              <div className="p-6 relative">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 className="w-6 h-6" />
                  <h3 className="text-lg font-semibold">Deep Analytics</h3>
                </div>
                <p className="text-blue-100 text-sm mb-4">
                  Get detailed charts, time-based analysis, and interactive filters.
                </p>
                <button
                  onClick={() => navigate('/analytics')}
                  className="w-full px-4 py-2.5 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                >
                  View Analytics
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
