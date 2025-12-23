import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Phone, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDuration } from '../lib/utils';

interface CallStats {
  totalCalls: number;
  completedCalls: number;
  successfulCalls: number;
  failedCalls: number;
  avgDuration: number;
  totalDuration: number;
}

export function CallAnalytics() {
  const { profile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<CallStats>({
    totalCalls: 0,
    completedCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    avgDuration: 0,
    totalDuration: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCallStats = async () => {
      if (authLoading || !profile?.company_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const { data: calls } = await supabase
          .from('calls')
          .select('*')
          .eq('company_id', profile.company_id);

        if (!calls) {
          setLoading(false);
          return;
        }

        const completedCalls = calls.filter(c => c.status === 'completed');
        const successfulCalls = calls.filter(c => c.success_evaluation === true);
        const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);

        setStats({
          totalCalls: calls.length,
          completedCalls: completedCalls.length,
          successfulCalls: successfulCalls.length,
          failedCalls: calls.length - successfulCalls.length,
          avgDuration: completedCalls.length > 0 ? Math.round(totalDuration / completedCalls.length) : 0,
          totalDuration,
        });
      } catch (error) {
        console.error('Error fetching call stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCallStats();
  }, [profile?.company_id, authLoading]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Loading call analytics...</p>
      </div>
    );
  }

  const successRate = stats.totalCalls > 0
    ? Math.round((stats.successfulCalls / stats.totalCalls) * 100)
    : 0;

  const completionRate = stats.totalCalls > 0
    ? Math.round((stats.completedCalls / stats.totalCalls) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Call Analytics</h2>
        <p className="text-slate-500">Analyze your AI call performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Calls</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.totalCalls}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <Phone className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Successful Calls</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.successfulCalls}</p>
                <p className="text-xs text-green-600 mt-1">{successRate}% success rate</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Failed Calls</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.failedCalls}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-100">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Avg Duration</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{formatDuration(stats.avgDuration)}</p>
              </div>
              <div className="p-3 rounded-lg bg-cyan-100">
                <Clock className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Call Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">Successful</span>
                  <span className="text-sm text-slate-500">{stats.successfulCalls} calls</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${successRate}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">Failed/Nurture</span>
                  <span className="text-sm text-slate-500">{stats.failedCalls} calls</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div
                    className="bg-red-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${100 - successRate}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">Completed</span>
                  <span className="text-sm text-slate-500">{stats.completedCalls} calls</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Call Duration Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">Total Talk Time</span>
                <span className="text-lg font-bold text-slate-900">{formatDuration(stats.totalDuration)}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">Average Call Duration</span>
                <span className="text-lg font-bold text-slate-900">{formatDuration(stats.avgDuration)}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">Completed Calls</span>
                <span className="text-lg font-bold text-slate-900">{stats.completedCalls}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">Completion Rate</span>
                <span className="text-lg font-bold text-slate-900">{completionRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.totalCalls === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Phone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Calls Yet</h3>
            <p className="text-sm text-slate-500">
              Call analytics will appear here once your AI agents start making calls to leads.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
