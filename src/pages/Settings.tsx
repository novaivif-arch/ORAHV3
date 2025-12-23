import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Building2, Lock, Bell, UserPlus, Shield, X, Check, Loader2, Copy, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface UserSettings {
  email_notifications: boolean;
  call_summaries: boolean;
  weekly_reports: boolean;
  marketing_updates: boolean;
  two_factor_enabled: boolean;
}

export function Settings() {
  const { profile, user, company, session } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [profileData, setProfileData] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [settings, setSettings] = useState<UserSettings>({
    email_notifications: true,
    call_summaries: true,
    weekly_reports: false,
    marketing_updates: false,
    two_factor_enabled: false,
  });

  useEffect(() => {
    if (profile) {
      setProfileData({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    loadUserSettings();
  }, [user?.id]);

  const loadUserSettings = async () => {
    if (!user?.id) return;

    setLoadingSettings(true);
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setSettings({
          email_notifications: data.email_notifications,
          call_summaries: data.call_summaries,
          weekly_reports: data.weekly_reports,
          marketing_updates: data.marketing_updates,
          two_factor_enabled: data.two_factor_enabled,
        });
      } else if (!error) {
        await supabase.from('user_settings').insert({ user_id: user.id });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const updateSetting = async (key: keyof UserSettings, value: boolean) => {
    if (!user?.id) return;

    const prevValue = settings[key];
    setSettings(prev => ({ ...prev, [key]: value }));

    try {
      const { error } = await supabase
        .from('user_settings')
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) {
        setSettings(prev => ({ ...prev, [key]: prevValue }));
        throw error;
      }

      showSuccess('Setting updated');
    } catch (error) {
      console.error('Error updating setting:', error);
      showError('Failed to update setting');
    }
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setErrorMessage('');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setSuccessMessage('');
    setTimeout(() => setErrorMessage(''), 5000);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('users')
        .update({
          name: profileData.name,
          phone: profileData.phone || null,
        })
        .eq('id', user.id);

      if (error) throw error;
      showSuccess('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showError('Password must be at least 8 characters');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      showSuccess('Password updated successfully');
    } catch (error) {
      console.error('Error changing password:', error);
      showError('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'company', label: 'Company', icon: Building2 },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-slate-500">Manage your account and preferences</p>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
          <X className="w-5 h-5" />
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-64">
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1">
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      disabled
                      className="bg-slate-50"
                    />
                    <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={profile?.role === 'super_admin' ? 'Super Admin' : profile?.role || ''}
                      disabled
                      className="bg-slate-50 capitalize"
                    />
                  </div>

                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === 'company' && (
            <Card>
              <CardHeader>
                <CardTitle>Company Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={company?.name || ''}
                      disabled
                      className="bg-slate-50"
                    />
                  </div>

                  <div>
                    <Label htmlFor="companyId">Company ID</Label>
                    <Input
                      id="companyId"
                      value={profile?.company_id || ''}
                      disabled
                      className="bg-slate-50 font-mono text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Subscription</Label>
                      <p className="mt-1 px-3 py-2 bg-slate-50 rounded-lg text-sm capitalize">
                        {company?.subscription_tier || 'Free'}
                      </p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <p className={cn(
                        "mt-1 px-3 py-2 rounded-lg text-sm capitalize",
                        company?.subscription_status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      )}>
                        {company?.subscription_status || 'Active'}
                      </p>
                    </div>
                  </div>

                  {profile?.role === 'admin' && (
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Team Management</h4>
                      <p className="text-sm text-slate-500 mb-3">
                        Invite team members to collaborate on lead management.
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowInviteModal(true)}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Invite Team Member
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      required
                      minLength={8}
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      required
                      minLength={8}
                    />
                  </div>

                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Change Password'
                    )}
                  </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-slate-700">Two-Factor Authentication</h4>
                      <p className="text-sm text-slate-500 mt-1">
                        Add an extra layer of security to your account.
                      </p>
                    </div>
                    <Button
                      variant={settings.two_factor_enabled ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => setShow2FAModal(true)}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      {settings.two_factor_enabled ? 'Manage 2FA' : 'Enable 2FA'}
                    </Button>
                  </div>
                  {settings.two_factor_enabled && (
                    <p className="mt-3 text-sm text-emerald-600 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Two-factor authentication is enabled
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSettings ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ToggleSetting
                      label="Email Notifications"
                      description="Receive updates about new leads and calls"
                      checked={settings.email_notifications}
                      onChange={(checked) => updateSetting('email_notifications', checked)}
                    />

                    <ToggleSetting
                      label="Call Summaries"
                      description="Get summaries of completed calls"
                      checked={settings.call_summaries}
                      onChange={(checked) => updateSetting('call_summaries', checked)}
                    />

                    <ToggleSetting
                      label="Weekly Reports"
                      description="Receive weekly analytics reports"
                      checked={settings.weekly_reports}
                      onChange={(checked) => updateSetting('weekly_reports', checked)}
                    />

                    <ToggleSetting
                      label="Marketing Updates"
                      description="News about new features and updates"
                      checked={settings.marketing_updates}
                      onChange={(checked) => updateSetting('marketing_updates', checked)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {showInviteModal && (
        <InviteTeamMemberModal
          companyId={profile?.company_id || ''}
          accessToken={session?.access_token || ''}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            showSuccess('Invitation sent successfully');
          }}
        />
      )}

      {show2FAModal && (
        <TwoFactorModal
          enabled={settings.two_factor_enabled}
          onClose={() => setShow2FAModal(false)}
          onToggle={(enabled) => {
            updateSetting('two_factor_enabled', enabled);
            setShow2FAModal(false);
          }}
        />
      )}
    </div>
  );
}

function ToggleSetting({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
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
    </div>
  );
}

function InviteTeamMemberModal({ companyId, accessToken, onClose, onSuccess }: {
  companyId: string;
  accessToken: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');

    try {
      const tempPassword = `Temp${Math.random().toString(36).slice(2, 10)}!`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            email,
            password: tempPassword,
            name,
            companyId,
            role: 'user',
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Invite Team Member</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm">
              {error}
            </div>
          )}
          <div>
            <Label htmlFor="inviteName">Full Name</Label>
            <Input
              id="inviteName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="John Doe"
            />
          </div>
          <div>
            <Label htmlFor="inviteEmail">Email Address</Label>
            <Input
              id="inviteEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="john@example.com"
            />
          </div>
          <p className="text-xs text-slate-500">
            A temporary password will be generated. The user will need to reset it on first login.
          </p>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={sending} className="flex-1">
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Send Invite
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TwoFactorModal({ enabled, onClose, onToggle }: {
  enabled: boolean;
  onClose: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  const [step, setStep] = useState(enabled ? 'manage' : 'setup');
  const [verificationCode, setVerificationCode] = useState('');
  const [copied, setCopied] = useState(false);

  const mockSecret = 'JBSWY3DPEHPK3PXP';

  const handleCopy = () => {
    navigator.clipboard.writeText(mockSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = () => {
    if (verificationCode.length === 6) {
      onToggle(true);
    }
  };

  const handleDisable = () => {
    onToggle(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {enabled ? 'Manage Two-Factor Authentication' : 'Enable Two-Factor Authentication'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          {enabled ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-xl flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <p className="text-sm text-emerald-700">Two-factor authentication is currently enabled</p>
              </div>
              <p className="text-sm text-slate-600">
                Your account is protected with an additional layer of security.
              </p>
              <Button variant="secondary" onClick={handleDisable} className="w-full text-rose-600 hover:bg-rose-50">
                Disable 2FA
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>

              <div className="p-4 bg-slate-100 rounded-xl flex items-center justify-center">
                <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center border-2 border-slate-200">
                  <Shield className="w-12 h-12 text-slate-400" />
                </div>
              </div>

              <div>
                <Label>Manual Entry Code</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input value={mockSecret} readOnly className="font-mono text-sm" />
                  <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="verifyCode">Verification Code</Label>
                <Input
                  id="verifyCode"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                />
              </div>

              <Button
                onClick={handleVerify}
                disabled={verificationCode.length !== 6}
                className="w-full"
              >
                Verify and Enable
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
