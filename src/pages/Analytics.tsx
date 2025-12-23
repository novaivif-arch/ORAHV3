import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { BarChart3, TrendingUp, Clock, Users, ArrowUpRight, ArrowDownRight, Calendar, Filter, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../lib/database.types';
import { getTimeCategory } from '../lib/timeClassification';
import { cn } from '../lib/utils';

type Lead = Database['public']['Tables']['leads']['Row'];

interface AnalyticsData {
  totalLeads: number;
  byStatus: Record<string, number>;
  byTimeCategory: Record<string, number>;
  successRate: number;
  byDay: { day: string; count: number }[];
  byHour: { hour: number; count: number }[];
  recentTrend: number;
}

export function Analytics() {
  const { profile, loading: authLoading } = useAuth();
  const [data, setData] = useState<AnalyticsData>({
    totalLeads: 0,
    byStatus: {},
    byTimeCategory: {},
    successRate: 0,
    byDay: [],
    byHour: [],
    recentTrend: 0,
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterTimeCategory, setFilterTimeCategory] = useState<string>('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (authLoading || !profile?.company_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const now = new Date();
        const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
        const startDate = new Date(now.getTime() - daysMap[timeRange] * 24 * 60 * 60 * 1000);

        const [leadsResult, callsResult] = await Promise.all([
          supabase
            .from('leads')
            .select('*')
            .eq('company_id', profile.company_id)
            .gte('created_at', startDate.toISOString()),
          supabase
            .from('calls')
            .select('lead_id, success_evaluation, created_at')
            .eq('company_id', profile.company_id)
            .gte('created_at', startDate.toISOString()),
        ]);

        let leads = leadsResult.data || [];
        const calls = callsResult.data || [];

        if (filterStatus) {
          leads = leads.filter(l => l.status === filterStatus);
        }

        if (filterTimeCategory) {
          leads = leads.filter(l => getTimeCategory(l.created_at) === filterTimeCategory);
        }

        const byStatus: Record<string, number> = {};
        const byTimeCategory: Record<string, number> = { 'Working Hours': 0, 'Non-Working Hours': 0 };
        const byDayMap: Record<string, number> = {};
        const byHourMap: Record<number, number> = {};

        leads.forEach((lead: Lead) => {
          byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;

          const timeCategory = getTimeCategory(lead.created_at);
          byTimeCategory[timeCategory]++;

          const day = new Date(lead.created_at).toLocaleDateString('en-US', { weekday: 'short' });
          byDayMap[day] = (byDayMap[day] || 0) + 1;

          const hour = new Date(lead.created_at).getHours();
          byHourMap[hour] = (byHourMap[hour] || 0) + 1;
        });

        const successfulCalls = calls.filter(c => c.success_evaluation).length;
        const successRate = calls.length > 0 ? Math.round((successfulCalls / calls.length) * 100) : 0;

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const byDay = days.map(day => ({ day, count: byDayMap[day] || 0 }));

        const byHour = Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          count: byHourMap[i] || 0,
        }));

        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const prevWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        const thisWeekLeads = leads.filter(l => new Date(l.created_at) >= lastWeek).length;
        const prevWeekLeads = leads.filter(l => {
          const d = new Date(l.created_at);
          return d >= prevWeek && d < lastWeek;
        }).length;

        const recentTrend = prevWeekLeads > 0
          ? Math.round(((thisWeekLeads - prevWeekLeads) / prevWeekLeads) * 100)
          : thisWeekLeads > 0 ? 100 : 0;

        setData({
          totalLeads: leads.length,
          byStatus,
          byTimeCategory,
          successRate,
          byDay,
          byHour,
          recentTrend,
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [profile?.company_id, authLoading, timeRange, filterStatus, filterTimeCategory]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const maxDayCount = Math.max(...data.byDay.map(d => d.count), 1);
  const maxHourCount = Math.max(...data.byHour.map(h => h.count), 1);
  const workingHoursPercent = data.totalLeads > 0
    ? Math.round((data.byTimeCategory['Working Hours'] / data.totalLeads) * 100)
    : 0;

  const statusColors: Record<string, { bg: string; bar: string }> = {
    new: { bg: 'bg-blue-100', bar: 'bg-gradient-to-r from-blue-500 to-blue-600' },
    contacted: { bg: 'bg-amber-100', bar: 'bg-gradient-to-r from-amber-500 to-amber-600' },
    qualified: { bg: 'bg-emerald-100', bar: 'bg-gradient-to-r from-emerald-500 to-emerald-600' },
    unqualified: { bg: 'bg-rose-100', bar: 'bg-gradient-to-r from-rose-500 to-rose-600' },
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Analytics</h2>
          <p className="text-slate-500 mt-1">Track your lead performance and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  timeRange === range
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowFilterModal(true)}
            className={cn(
              "p-2.5 rounded-xl hover:bg-slate-200 transition-colors relative",
              (filterStatus || filterTimeCategory) ? "bg-blue-50" : "bg-slate-100"
            )}
          >
            <Filter className={cn("w-5 h-5", (filterStatus || filterTimeCategory) ? "text-blue-600" : "text-slate-600")} />
            {(filterStatus || filterTimeCategory) && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full" />
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Leads</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{data.totalLeads}</p>
                <div className={`flex items-center gap-1 mt-2 text-sm ${data.recentTrend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {data.recentTrend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  <span className="font-medium">{Math.abs(data.recentTrend)}%</span>
                  <span className="text-slate-400">vs last week</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Success Rate</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{data.successRate}%</p>
                <div className="flex items-center gap-1 mt-2 text-sm text-emerald-600">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="font-medium">+5%</span>
                  <span className="text-slate-400">vs last week</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Working Hours</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{data.byTimeCategory['Working Hours']}</p>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  <span className="font-medium text-cyan-600">{workingHoursPercent}%</span>
                  <span className="text-slate-400">of total leads</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Non-Working Hours</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{data.byTimeCategory['Non-Working Hours']}</p>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  <span className="font-medium text-slate-600">{100 - workingHoursPercent}%</span>
                  <span className="text-slate-400">of total leads</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
                Leads by Status
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-5">
              {Object.entries(data.byStatus).length > 0 ? (
                Object.entries(data.byStatus).map(([status, count]) => {
                  const percentage = data.totalLeads > 0 ? (count / data.totalLeads) * 100 : 0;
                  const colors = statusColors[status] || { bg: 'bg-slate-100', bar: 'bg-slate-500' };
                  return (
                    <div key={status} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${colors.bar}`}></div>
                          <span className="text-sm font-semibold text-slate-700 capitalize">{status}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{count}</span>
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-3 rounded-full ${colors.bar} transition-all duration-500 group-hover:opacity-80`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <BarChart3 className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">No data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <Calendar className="w-4 h-4 text-cyan-600" />
              </div>
              Leads by Day
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-end justify-between h-52 gap-3 px-2">
              {data.byDay.map(({ day, count }) => {
                const height = maxDayCount > 0 ? (count / maxDayCount) * 100 : 0;
                return (
                  <div key={day} className="flex-1 flex flex-col items-center group">
                    <div className="w-full flex flex-col items-center justify-end h-44">
                      <span className="text-xs font-semibold text-slate-600 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">{count}</span>
                      <div
                        className="w-full bg-gradient-to-t from-blue-600 to-cyan-500 rounded-t-lg transition-all duration-300 group-hover:from-blue-700 group-hover:to-cyan-600"
                        style={{ height: `${height}%`, minHeight: count > 0 ? '8px' : '0' }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-500 mt-3">{day}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            Hourly Distribution
          </CardTitle>
          <p className="text-sm text-slate-500 mt-1">Lead activity throughout the day</p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex items-end h-40 gap-1 overflow-x-auto pb-2">
            {data.byHour.map(({ hour, count }) => {
              const height = maxHourCount > 0 ? (count / maxHourCount) * 100 : 0;
              const isWorkingHour = hour >= 9 && hour < 18;
              return (
                <div key={hour} className="flex flex-col items-center group min-w-[30px]">
                  <div className="w-full flex flex-col items-center justify-end h-32">
                    <div
                      className={`w-5 rounded-t transition-all duration-200 group-hover:opacity-80 ${
                        isWorkingHour
                          ? 'bg-gradient-to-t from-emerald-500 to-emerald-400'
                          : 'bg-gradient-to-t from-slate-400 to-slate-300'
                      }`}
                      style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                    />
                  </div>
                  <span className={`text-[10px] mt-2 ${hour % 3 === 0 ? 'text-slate-500' : 'text-transparent'}`}>
                    {hour.toString().padStart(2, '0')}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-sm text-slate-600">Working Hours (9 AM - 6 PM)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-400"></div>
              <span className="text-sm text-slate-600">Non-Working Hours</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Time Distribution Overview</h3>
              <p className="text-slate-400 text-sm">Understanding when your leads are most active</p>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-cyan-400">{workingHoursPercent}%</p>
                <p className="text-xs text-slate-400 mt-1">Working Hours</p>
              </div>
              <div className="w-px h-12 bg-slate-700"></div>
              <div className="text-center">
                <p className="text-3xl font-bold text-slate-400">{100 - workingHoursPercent}%</p>
                <p className="text-xs text-slate-400 mt-1">Non-Working</p>
              </div>
            </div>
          </div>
          <div className="mt-6 w-full bg-slate-700 rounded-full h-4 overflow-hidden flex">
            {data.totalLeads > 0 ? (
              <>
                <div
                  className="bg-gradient-to-r from-cyan-400 to-cyan-500 h-full transition-all duration-500"
                  style={{ width: `${workingHoursPercent}%` }}
                />
                <div
                  className="bg-slate-500 h-full transition-all duration-500"
                  style={{ width: `${100 - workingHoursPercent}%` }}
                />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
                No data
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showFilterModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Filter Analytics</h2>
              <button
                onClick={() => setShowFilterModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lead Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="converted">Converted</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Time Category</label>
                <select
                  value={filterTimeCategory}
                  onChange={(e) => setFilterTimeCategory(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Hours</option>
                  <option value="Working Hours">Working Hours Only</option>
                  <option value="Non-Working Hours">Non-Working Hours Only</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setFilterStatus('');
                    setFilterTimeCategory('');
                    setShowFilterModal(false);
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                >
                  Clear Filters
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilterModal(false)}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
