import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Shield,
  ShieldCheck,
  ShieldOff,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../lib/database.types';
import { cn } from '../lib/utils';

type UserProfile = Database['public']['Tables']['users']['Row'];
type UserPermissions = Database['public']['Tables']['permissions']['Row'];

interface UserWithPermissions extends UserProfile {
  permissions?: UserPermissions | null;
}

export function UserManagement() {
  const navigate = useNavigate();
  const { profile, isAdmin, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
  const [actionMenuUser, setActionMenuUser] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    loadUsers();
  }, [isAdmin, navigate]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      let query = supabase.from('users').select('*');

      if (!isSuperAdmin && profile?.company_id) {
        query = query.eq('company_id', profile.company_id);
      }

      const { data: usersData } = await query.order('created_at', { ascending: false });

      if (usersData) {
        const userIds = usersData.filter(u => ['user', 'member'].includes(u.role)).map(u => u.id);

        let permissionsData: UserPermissions[] = [];
        if (userIds.length > 0) {
          const { data } = await supabase
            .from('permissions')
            .select('*')
            .in('user_id', userIds);
          permissionsData = data || [];
        }

        const usersWithPermissions: UserWithPermissions[] = usersData.map(u => ({
          ...u,
          permissions: permissionsData.find(p => p.user_id === u.id) || null,
        }));

        setUsers(usersWithPermissions);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      await supabase.from('users').update({ is_active: !isActive }).eq('id', userId);
      loadUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
    setActionMenuUser(null);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      await supabase.from('users').delete().eq('id', userId);
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
    setActionMenuUser(null);
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            Super Admin
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Shield className="w-3.5 h-3.5" />
            Admin
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            <Users className="w-3.5 h-3.5" />
            User
          </span>
        );
    }
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
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">Manage team members and their permissions</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>
              <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <Filter className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-500">{filteredUsers.length} users</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Permissions</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{user.name}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </span>
                          {user.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {user.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                      user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                    )}>
                      {user.is_active ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          Inactive
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {['user', 'member'].includes(user.role) ? (
                      <div className="flex flex-wrap gap-1">
                        {user.permissions?.can_view_analytics && (
                          <span className="px-2 py-0.5 bg-cyan-100 text-cyan-600 rounded text-xs">Analytics</span>
                        )}
                        {user.permissions?.can_make_calls && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded text-xs">Calls</span>
                        )}
                        {user.permissions?.can_export_data && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-600 rounded text-xs">Export</span>
                        )}
                        {user.permissions?.can_manage_leads && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-xs">Leads</span>
                        )}
                        {!user.permissions && (
                          <span className="text-xs text-slate-400">Default</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Full Access</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-500 text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setActionMenuUser(actionMenuUser === user.id ? null : user.id)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-slate-500" />
                      </button>
                      {actionMenuUser === user.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-10">
                          {['user', 'member'].includes(user.role) && (
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowPermissionModal(true);
                                setActionMenuUser(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Shield className="w-4 h-4 text-slate-500" />
                              Edit Permissions
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleActive(user.id, user.is_active)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            {user.is_active ? (
                              <>
                                <ShieldOff className="w-4 h-4 text-amber-500" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                Activate
                              </>
                            )}
                          </button>
                          {user.id !== profile?.id && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-rose-600"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete User
                            </button>
                          )}
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

      {showAddModal && (
        <AddUserModal
          companyId={profile?.company_id || ''}
          onClose={() => setShowAddModal(false)}
          onSave={loadUsers}
        />
      )}

      {showPermissionModal && selectedUser && (
        <PermissionModal
          user={selectedUser}
          onClose={() => {
            setShowPermissionModal(false);
            setSelectedUser(null);
          }}
          onSave={loadUsers}
        />
      )}
    </div>
  );
}

function AddUserModal({ companyId, onClose, onSave }: { companyId: string; onClose: () => void; onSave: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            email,
            password,
            name,
            phone,
            companyId,
            role: 'user',
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Add New User</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone (Optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PermissionModal({ user, onClose, onSave }: { user: UserWithPermissions; onClose: () => void; onSave: () => void }) {
  const [permissions, setPermissions] = useState({
    can_view_analytics: user.permissions?.can_view_analytics || false,
    can_make_calls: user.permissions?.can_make_calls ?? true,
    can_export_data: user.permissions?.can_export_data || false,
    can_manage_leads: user.permissions?.can_manage_leads || false,
    can_view_all_leads: user.permissions?.can_view_all_leads || false,
    can_edit_leads: user.permissions?.can_edit_leads ?? true,
    can_delete_leads: user.permissions?.can_delete_leads || false,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await supabase
        .from('permissions')
        .upsert({
          user_id: user.id,
          ...permissions,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating permissions:', error);
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (key: keyof typeof permissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Edit Permissions</h2>
          <p className="text-sm text-slate-500 mt-1">Configure access for {user.name}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-3">
            <PermissionToggle
              label="View Analytics"
              description="Can view analytics and reports"
              checked={permissions.can_view_analytics}
              onChange={() => togglePermission('can_view_analytics')}
            />
            <PermissionToggle
              label="Make Calls"
              description="Can initiate calls to leads"
              checked={permissions.can_make_calls}
              onChange={() => togglePermission('can_make_calls')}
            />
            <PermissionToggle
              label="Export Data"
              description="Can export leads and reports"
              checked={permissions.can_export_data}
              onChange={() => togglePermission('can_export_data')}
            />
            <PermissionToggle
              label="Manage Leads"
              description="Can create and assign leads"
              checked={permissions.can_manage_leads}
              onChange={() => togglePermission('can_manage_leads')}
            />
            <PermissionToggle
              label="View All Leads"
              description="Can see all company leads"
              checked={permissions.can_view_all_leads}
              onChange={() => togglePermission('can_view_all_leads')}
            />
            <PermissionToggle
              label="Edit Leads"
              description="Can modify lead information"
              checked={permissions.can_edit_leads}
              onChange={() => togglePermission('can_edit_leads')}
            />
            <PermissionToggle
              label="Delete Leads"
              description="Can permanently remove leads"
              checked={permissions.can_delete_leads}
              onChange={() => togglePermission('can_delete_leads')}
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
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PermissionToggle({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
      <div>
        <p className="font-medium text-slate-900 text-sm">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors',
          checked ? 'bg-blue-600' : 'bg-slate-300'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
            checked && 'translate-x-5'
          )}
        />
      </button>
    </label>
  );
}
