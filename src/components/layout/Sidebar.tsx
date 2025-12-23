import { NavLink } from 'react-router-dom';
import { Home, Users, BarChart3, Bot, Plug, Settings, X, Activity, ChevronRight, Building2, Shield, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Logo } from '../ui/Logo';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../lib/database.types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  to: string;
  icon: typeof Home;
  description: string;
  roles?: UserRole[];
  requirePermission?: 'can_view_analytics' | 'can_manage_leads';
}

const navigation: NavItem[] = [
  { name: 'Dashboard', to: '/dashboard', icon: Home, description: 'Overview & stats' },
  { name: 'Super Admin', to: '/super-admin', icon: Building2, description: 'System management', roles: ['super_admin'] },
  { name: 'User Management', to: '/users', icon: Shield, description: 'Manage team', roles: ['super_admin', 'admin'] },
  { name: 'Leads', to: '/leads', icon: Users, description: 'Manage leads' },
  { name: 'Analytics', to: '/analytics', icon: BarChart3, description: 'Charts & insights', requirePermission: 'can_view_analytics' },
  { name: 'Call Analytics', to: '/call-analytics', icon: Activity, description: 'Call metrics', requirePermission: 'can_view_analytics' },
  { name: 'Agents', to: '/agents', icon: Bot, description: 'AI voice agents', roles: ['super_admin', 'admin'] },
  { name: 'Integrations', to: '/integrations', icon: Plug, description: 'Connect apps', roles: ['super_admin', 'admin'] },
  { name: 'Audit Logs', to: '/audit-logs', icon: FileText, description: 'Activity history', roles: ['super_admin', 'admin'] },
  { name: 'Settings', to: '/settings', icon: Settings, description: 'Preferences' },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { profile, hasPermission, isSuperAdmin, isAdmin } = useAuth();

  const filteredNavigation = navigation.filter((item) => {
    if (item.roles) {
      if (!profile?.role) return false;
      if (!item.roles.includes(profile.role as UserRole)) return false;
    }

    if (item.requirePermission) {
      if (!isSuperAdmin && !isAdmin && !hasPermission(item.requirePermission)) {
        return false;
      }
    }

    return true;
  });

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen w-72 bg-white border-r border-slate-200/80 transition-all duration-300 lg:translate-x-0 shadow-xl lg:shadow-none flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Logo variant="icon" className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-slate-900">ORAH</span>
              <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">Voice AI Platform</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {profile && (
          <div className="px-4 py-3 border-b border-slate-200/80">
            <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{profile.name}</p>
                <p className="text-[10px] text-slate-500 capitalize">
                  {profile.role === 'super_admin' ? 'Super Admin' : profile.role}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4" style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 #f1f5f9'
        }}>
          <style>{`
            .sidebar-nav::-webkit-scrollbar {
              width: 6px;
            }
            .sidebar-nav::-webkit-scrollbar-track {
              background: #f1f5f9;
              border-radius: 10px;
            }
            .sidebar-nav::-webkit-scrollbar-thumb {
              background: #cbd5e1;
              border-radius: 10px;
            }
            .sidebar-nav::-webkit-scrollbar-thumb:hover {
              background: #94a3b8;
            }
          `}</style>
          <p className="px-3 mb-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Main Menu</p>
          <nav className="space-y-1 sidebar-nav">
            {filteredNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.to}
                onClick={() => onClose()}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={cn(
                      'p-2 rounded-lg transition-colors flex-shrink-0',
                      isActive ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-slate-200'
                    )}>
                      <item.icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-700')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block truncate">{item.name}</span>
                      <span className={cn(
                        'text-[11px] transition-colors block truncate',
                        isActive ? 'text-blue-100' : 'text-slate-400'
                      )}>{item.description}</span>
                    </div>
                    <ChevronRight className={cn(
                      'w-4 h-4 opacity-0 -translate-x-2 transition-all flex-shrink-0',
                      isActive ? 'opacity-100 translate-x-0 text-white/70' : 'group-hover:opacity-100 group-hover:translate-x-0 text-slate-400'
                    )} />
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
