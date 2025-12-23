import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import {
  Plug, FileSpreadsheet, Phone, MessageSquare, Mail, CheckCircle2,
  X, Key, Copy, Check, ExternalLink, Loader2, Trash2, Plus, AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: 'connected' | 'available' | 'coming_soon';
  color: string;
  type: string;
}

interface ApiKeyData {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  created_at: string;
}

interface WebhookData {
  id?: string;
  event_type: string;
  url: string;
  is_active: boolean;
  secret?: string;
}

const defaultIntegrations: Integration[] = [
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Sync leads from your Google Sheets automatically',
    icon: FileSpreadsheet,
    status: 'available',
    color: 'bg-green-100 text-green-600',
    type: 'storage',
  },
  {
    id: 'vapi',
    name: 'Vapi AI',
    description: 'AI voice calling platform for automated outreach',
    icon: Phone,
    status: 'available',
    color: 'bg-blue-100 text-blue-600',
    type: 'communication',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Send automated follow-up messages via WhatsApp',
    icon: MessageSquare,
    status: 'coming_soon',
    color: 'bg-emerald-100 text-emerald-600',
    type: 'communication',
  },
  {
    id: 'email',
    name: 'Email',
    description: 'Automated email campaigns and follow-ups',
    icon: Mail,
    status: 'coming_soon',
    color: 'bg-orange-100 text-orange-600',
    type: 'communication',
  },
];

export function Integrations() {
  const { profile, session } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>(defaultIntegrations);
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnectModal, setShowConnectModal] = useState<Integration | null>(null);
  const [showConfigureModal, setShowConfigureModal] = useState<Integration | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadData();
  }, [profile?.company_id]);

  const loadData = async () => {
    if (!profile?.company_id) return;

    setLoading(true);
    try {
      const { data: intData } = await supabase
        .from('integrations')
        .select('*')
        .eq('company_id', profile.company_id);

      if (intData) {
        const updatedIntegrations = defaultIntegrations.map(int => {
          const dbInt = intData.find(d => d.name.toLowerCase().replace(' ', '-') === int.id);
          if (dbInt && dbInt.status === 'connected') {
            return { ...int, status: 'connected' as const };
          }
          return int;
        });
        setIntegrations(updatedIntegrations);
      }

      const { data: webhookData } = await supabase
        .from('webhooks')
        .select('*')
        .eq('company_id', profile.company_id);

      setWebhooks(webhookData || []);

      if (session?.access_token) {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-api-key`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setApiKeys(data.keys || []);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (integration: Integration) => {
    if (!profile?.company_id) return;

    try {
      await supabase.from('integrations').upsert({
        company_id: profile.company_id,
        name: integration.name,
        type: integration.type,
        status: 'connected',
        connected_at: new Date().toISOString(),
      }, { onConflict: 'company_id,name' });

      setIntegrations(prev =>
        prev.map(int => int.id === integration.id ? { ...int, status: 'connected' as const } : int)
      );
      setShowConnectModal(null);
      showSuccess(`${integration.name} connected successfully`);
    } catch (error) {
      console.error('Error connecting integration:', error);
    }
  };

  const handleDisconnect = async (integration: Integration) => {
    if (!profile?.company_id) return;

    if (!confirm(`Are you sure you want to disconnect ${integration.name}?`)) return;

    try {
      await supabase
        .from('integrations')
        .update({ status: 'disconnected' })
        .eq('company_id', profile.company_id)
        .eq('name', integration.name);

      setIntegrations(prev =>
        prev.map(int => int.id === integration.id ? { ...int, status: 'available' as const } : int)
      );
      showSuccess(`${integration.name} disconnected`);
    } catch (error) {
      console.error('Error disconnecting integration:', error);
    }
  };

  const handleGenerateApiKey = async (name: string) => {
    if (!session?.access_token) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-api-key`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ name }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        setNewApiKey(data.apiKey);
        loadData();
      }
    } catch (error) {
      console.error('Error generating API key:', error);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!session?.access_token) return;
    if (!confirm('Are you sure you want to revoke this API key?')) return;

    try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-api-key`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ keyId }),
        }
      );
      loadData();
      showSuccess('API key revoked');
    } catch (error) {
      console.error('Error deleting API key:', error);
    }
  };

  const handleSaveWebhook = async (eventType: string, url: string) => {
    if (!profile?.company_id) return;

    try {
      const secret = `whsec_${Math.random().toString(36).slice(2, 34)}`;

      await supabase.from('webhooks').upsert({
        company_id: profile.company_id,
        event_type: eventType,
        url,
        is_active: true,
        secret,
      }, { onConflict: 'company_id,event_type' });

      loadData();
      setShowWebhookModal(null);
      showSuccess('Webhook configured');
    } catch (error) {
      console.error('Error saving webhook:', error);
    }
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const webhookEvents = [
    { type: 'lead_created', name: 'Lead Created', description: 'Triggered when a new lead is added' },
    { type: 'call_completed', name: 'Call Completed', description: 'Triggered when a call ends' },
    { type: 'lead_status_changed', name: 'Lead Status Changed', description: 'Triggered when lead status updates' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Integrations</h2>
        <p className="text-slate-500">Connect ORAH with your favorite tools</p>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration) => (
          <Card key={integration.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${integration.color}`}>
                    <integration.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {integration.name}
                      {integration.status === 'connected' && (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      )}
                    </CardTitle>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      integration.status === 'connected'
                        ? 'bg-green-100 text-green-700'
                        : integration.status === 'available'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-600'
                    )}>
                      {integration.status === 'connected'
                        ? 'Connected'
                        : integration.status === 'available'
                        ? 'Available'
                        : 'Coming Soon'}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-4">{integration.description}</p>
              {integration.status === 'connected' ? (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowConfigureModal(integration)}
                  >
                    Configure
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => handleDisconnect(integration)}
                  >
                    Disconnect
                  </Button>
                </div>
              ) : integration.status === 'available' ? (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => setShowConnectModal(integration)}
                >
                  <Plug className="w-4 h-4 mr-2" />
                  Connect
                </Button>
              ) : (
                <Button variant="secondary" size="sm" className="w-full" disabled>
                  Coming Soon
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>API Access</CardTitle>
            <Button size="sm" onClick={() => setShowApiKeyModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New API Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">
            Use our REST API to integrate ORAH with your custom applications and workflows.
          </p>
          <div className="p-4 bg-slate-50 rounded-lg mb-4">
            <p className="text-xs text-slate-500 mb-2">API Endpoint</p>
            <code className="text-sm font-mono text-slate-700">
              {import.meta.env.VITE_SUPABASE_URL}/functions/v1
            </code>
          </div>

          {apiKeys.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-sm font-medium text-slate-700">Your API Keys</p>
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{key.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{key.key_prefix}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => handleDeleteApiKey(key.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open('https://docs.orah.ai', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Documentation
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">
            Set up webhooks to receive real-time notifications about lead and call events.
          </p>
          <div className="space-y-3">
            {webhookEvents.map((event) => {
              const webhook = webhooks.find(w => w.event_type === event.type);
              return (
                <div key={event.type} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {webhook?.is_active && (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-700">{event.name}</p>
                      <p className="text-xs text-slate-500">{event.description}</p>
                      {webhook?.url && (
                        <p className="text-xs text-blue-600 font-mono mt-1 truncate max-w-xs">{webhook.url}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowWebhookModal(event.type)}
                  >
                    {webhook ? 'Edit' : 'Configure'}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {showConnectModal && (
        <ConnectIntegrationModal
          integration={showConnectModal}
          onClose={() => setShowConnectModal(null)}
          onConnect={() => handleConnect(showConnectModal)}
        />
      )}

      {showConfigureModal && (
        <ConfigureIntegrationModal
          integration={showConfigureModal}
          onClose={() => setShowConfigureModal(null)}
        />
      )}

      {showApiKeyModal && (
        <ApiKeyModal
          newKey={newApiKey}
          onClose={() => {
            setShowApiKeyModal(false);
            setNewApiKey(null);
          }}
          onGenerate={handleGenerateApiKey}
        />
      )}

      {showWebhookModal && (
        <WebhookModal
          eventType={showWebhookModal}
          existingWebhook={webhooks.find(w => w.event_type === showWebhookModal)}
          onClose={() => setShowWebhookModal(null)}
          onSave={handleSaveWebhook}
        />
      )}
    </div>
  );
}

function ConnectIntegrationModal({ integration, onClose, onConnect }: {
  integration: Integration;
  onClose: () => void;
  onConnect: () => void;
}) {
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    await onConnect();
    setConnecting(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Connect {integration.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-6">
          <div className={cn("w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4", integration.color)}>
            <integration.icon className="w-8 h-8" />
          </div>
          <p className="text-center text-slate-600 mb-6">{integration.description}</p>
          <div className="space-y-3">
            <Button onClick={handleConnect} disabled={connecting} className="w-full">
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Plug className="w-4 h-4 mr-2" />
                  Connect {integration.name}
                </>
              )}
            </Button>
            <Button variant="secondary" onClick={onClose} className="w-full">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigureIntegrationModal({ integration, onClose }: {
  integration: Integration;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Configure {integration.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-6">
          <div className="p-4 bg-emerald-50 rounded-xl flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <p className="text-sm text-emerald-700">{integration.name} is connected and active</p>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Your integration is configured and syncing data automatically.
          </p>
          <Button variant="secondary" onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

function ApiKeyModal({ newKey, onClose, onGenerate }: {
  newKey: string | null;
  onClose: () => void;
  onGenerate: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!name.trim()) return;
    setGenerating(true);
    await onGenerate(name);
    setGenerating(false);
  };

  const handleCopy = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {newKey ? 'API Key Generated' : 'Generate API Key'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-6">
          {newKey ? (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    Make sure to copy your API key now. You won't be able to see it again!
                  </p>
                </div>
              </div>
              <div>
                <Label>Your API Key</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input value={newKey} readOnly className="font-mono text-sm" />
                  <Button variant="secondary" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <Button onClick={onClose} className="w-full">Done</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="keyName">Key Name</Label>
                <Input
                  id="keyName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Production API Key"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleGenerate} disabled={generating || !name.trim()} className="flex-1">
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WebhookModal({ eventType, existingWebhook, onClose, onSave }: {
  eventType: string;
  existingWebhook?: WebhookData;
  onClose: () => void;
  onSave: (eventType: string, url: string) => void;
}) {
  const [url, setUrl] = useState(existingWebhook?.url || '');
  const [saving, setSaving] = useState(false);

  const eventNames: Record<string, string> = {
    lead_created: 'Lead Created',
    call_completed: 'Call Completed',
    lead_status_changed: 'Lead Status Changed',
  };

  const handleSave = async () => {
    if (!url.trim()) return;
    setSaving(true);
    await onSave(eventType, url);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Configure Webhook</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <Label>Event</Label>
            <Input value={eventNames[eventType]} disabled className="bg-slate-50" />
          </div>
          <div>
            <Label htmlFor="webhookUrl">Webhook URL</Label>
            <Input
              id="webhookUrl"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-server.com/webhook"
            />
          </div>
          {existingWebhook?.secret && (
            <div>
              <Label>Signing Secret</Label>
              <Input value={existingWebhook.secret} readOnly className="font-mono text-xs bg-slate-50" />
              <p className="text-xs text-slate-500 mt-1">Use this to verify webhook signatures</p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !url.trim()} className="flex-1">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Webhook'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
