import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Shield,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreVertical,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../lib/database.types';
import { cn } from '../lib/utils';

type Company = Database['public']['Tables']['companies']['Row'];
type UserProfile = Database['public']['Tables']['users']['Row'];

interface CompanyWithStats extends Company {
  userCount: number;
  leadCount: number;
}

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [companies, setCompanies] = useState<CompanyWithStats[]>([]);
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithStats | null>(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [stats, setStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    totalUsers: 0,
    totalLeads: 0,
  });

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/dashboard');
      return;
    }
    loadData();
  }, [isSuperAdmin, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: companiesData } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .in('role', ['admin', 'super_admin']);

      const { data: allUsersData } = await supabase
        .from('users')
        .select('company_id');

      const { data: leadsData } = await supabase
        .from('leads')
        .select('company_id');

      const userCountByCompany: Record<string, number> = {};
      const leadCountByCompany: Record<string, number> = {};

      allUsersData?.forEach(u => {
        if (u.company_id) {
          userCountByCompany[u.company_id] = (userCountByCompany[u.company_id] || 0) + 1;
        }
      });

      leadsData?.forEach(l => {
        if (l.company_id) {
          leadCountByCompany[l.company_id] = (leadCountByCompany[l.company_id] || 0) + 1;
        }
      });

      const enrichedCompanies: CompanyWithStats[] = (companiesData || []).map(c => ({
        ...c,
        userCount: userCountByCompany[c.id] || 0,
        leadCount: leadCountByCompany[c.id] || 0,
      }));

      setCompanies(enrichedCompanies);
      setAdmins(usersData || []);
      setStats({
        totalCompanies: enrichedCompanies.length,
        activeCompanies: enrichedCompanies.filter(c => c.subscription_status === 'active').length,
        totalUsers: allUsersData?.length || 0,
        totalLeads: leadsData?.length || 0,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (companyId: string, status: 'active' | 'suspended' | 'cancelled') => {
    try {
      await supabase
        .from('companies')
        .update({ subscription_status: status })
        .eq('id', companyId);
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle className="w-3.5 h-3.5" />
            Active
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5" />
            Suspended
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const getTierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      free: 'bg-slate-100 text-slate-600',
      basic: 'bg-blue-100 text-blue-600',
      pro: 'bg-cyan-100 text-cyan-600',
      enterprise: 'bg-amber-100 text-amber-600',
    };
    return (
      <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium capitalize', colors[tier] || colors.free)}>
        {tier}
      </span>
    );
  };

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
          <h1 className="text-2xl font-bold text-slate-900">Super Admin Dashboard</h1>
          <p className="text-slate-500 mt-1">System-wide management and oversight</p>
        </div>
        <button
          onClick={() => setShowCompanyModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Company
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Companies</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalCompanies}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active Companies</p>
              <p className="text-2xl font-bold text-slate-900">{stats.activeCompanies}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Users</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Leads</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalLeads}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Companies</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <Filter className="w-4 h-4 text-slate-500" />
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <Download className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Subscription</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Users</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Leads</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                        {company.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{company.name}</p>
                        <p className="text-xs text-slate-500">Max {company.max_users} users</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getTierBadge(company.subscription_tier)}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(company.subscription_status)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-900 font-medium">{company.userCount}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-900 font-medium">{company.leadCount}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-500 text-sm">
                      {new Date(company.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setSelectedCompany(selectedCompany?.id === company.id ? null : company)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-slate-500" />
                      </button>
                      {selectedCompany?.id === company.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-10">
                          <button
                            onClick={() => {
                              handleStatusChange(company.id, 'active');
                              setSelectedCompany(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 text-emerald-600"
                          >
                            Activate
                          </button>
                          <button
                            onClick={() => {
                              handleStatusChange(company.id, 'suspended');
                              setSelectedCompany(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 text-amber-600"
                          >
                            Suspend
                          </button>
                          <button
                            onClick={() => {
                              handleStatusChange(company.id, 'cancelled');
                              setSelectedCompany(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 text-rose-600"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">System Administrators</h2>
        </div>
        <div className="divide-y divide-slate-200">
          {admins.map((admin) => (
            <div key={admin.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white font-semibold">
                  {admin.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{admin.name}</p>
                  <p className="text-sm text-slate-500">{admin.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium',
                  admin.role === 'super_admin' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
                )}>
                  {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </span>
                <span className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium',
                  admin.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'
                )}>
                  {admin.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCompanyModal && (
        <CompanyModal
          onClose={() => setShowCompanyModal(false)}
          onSave={loadData}
        />
      )}
    </div>
  );
}

function CompanyModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [name, setName] = useState('');
  const [tier, setTier] = useState('free');
  const [maxUsers, setMaxUsers] = useState(5);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await supabase.from('companies').insert({
        name,
        subscription_tier: tier,
        subscription_status: 'active',
        max_users: maxUsers,
      });
      onSave();
      onClose();
    } catch (error) {
      console.error('Error creating company:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Add New Company</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subscription Tier</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Max Users</label>
            <input
              type="number"
              value={maxUsers}
              onChange={(e) => setMaxUsers(parseInt(e.target.value))}
              min={1}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
