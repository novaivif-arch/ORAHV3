import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  User,
  Calendar,
  Activity,
  Shield,
  Eye,
  Edit,
  Trash2,
  Plus,
  Download,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../lib/database.types';
import { cn } from '../lib/utils';

type AuditLog = Database['public']['Tables']['audit_logs']['Row'];

interface AuditLogWithUser extends AuditLog {
  userName?: string;
}

const actionIcons: Record<string, typeof Activity> = {
  create: Plus,
  read: Eye,
  update: Edit,
  delete: Trash2,
  login: User,
  logout: User,
};

const actionColors: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-600',
  read: 'bg-blue-100 text-blue-600',
  update: 'bg-amber-100 text-amber-600',
  delete: 'bg-rose-100 text-rose-600',
  login: 'bg-cyan-100 text-cyan-600',
  logout: 'bg-slate-100 text-slate-600',
};

export function AuditLogs() {
  const navigate = useNavigate();
  const { isAdmin, session } = useAuth();
  const [logs, setLogs] = useState<AuditLogWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    loadLogs();
  }, [isAdmin, navigate]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-log`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );

      const data = await response.json();
      if (data.logs) {
        const userIds = [...new Set(data.logs.map((l: AuditLog) => l.user_id).filter(Boolean))];

        let usersMap: Record<string, string> = {};
        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, name')
            .in('id', userIds);

          usersMap = (usersData || []).reduce((acc, u) => {
            acc[u.id] = u.name;
            return acc;
          }, {} as Record<string, string>);
        }

        const logsWithUsers: AuditLogWithUser[] = data.logs.map((log: AuditLog) => ({
          ...log,
          userName: log.user_id ? usersMap[log.user_id] || 'Unknown' : 'System',
        }));

        setLogs(logsWithUsers);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.userName?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = !filterAction || log.action === filterAction;

    return matchesSearch && matchesFilter;
  });

  const uniqueActions = [...new Set(logs.map(l => l.action))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
          <p className="text-slate-500 mt-1">Track all system activities and changes</p>
        </div>
        <button
          onClick={loadLogs}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-200 max-h-[600px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No audit logs found</p>
              <p className="text-sm mt-1">Activity will be recorded here</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const ActionIcon = actionIcons[log.action] || Activity;
              const actionColor = actionColors[log.action] || 'bg-slate-100 text-slate-600';

              return (
                <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={cn('p-2 rounded-lg flex-shrink-0', actionColor)}>
                      <ActionIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900 capitalize">{log.action}</span>
                        <span className="text-slate-400">on</span>
                        <span className="font-medium text-slate-700">{log.resource}</span>
                        {log.resource_id && (
                          <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">
                            {log.resource_id.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {log.userName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                        {log.ip_address && (
                          <span className="text-xs text-slate-400">
                            IP: {log.ip_address}
                          </span>
                        )}
                      </div>
                      {log.details && Object.keys(log.details as object).length > 0 && (
                        <div className="mt-2 p-2 bg-slate-50 rounded-lg">
                          <pre className="text-xs text-slate-600 overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
