import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plug, FileSpreadsheet, Phone, MessageSquare, Mail, CheckCircle2 } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: 'connected' | 'available' | 'coming_soon';
  color: string;
}

const integrations: Integration[] = [
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Sync leads from your Google Sheets automatically',
    icon: FileSpreadsheet,
    status: 'available',
    color: 'bg-green-100 text-green-600',
  },
  {
    id: 'vapi',
    name: 'Vapi AI',
    description: 'AI voice calling platform for automated outreach',
    icon: Phone,
    status: 'available',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Send automated follow-up messages via WhatsApp',
    icon: MessageSquare,
    status: 'coming_soon',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    id: 'email',
    name: 'Email',
    description: 'Automated email campaigns and follow-ups',
    icon: Mail,
    status: 'coming_soon',
    color: 'bg-orange-100 text-orange-600',
  },
];

export function Integrations() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Integrations</h2>
        <p className="text-slate-500">Connect ORAH with your favorite tools</p>
      </div>

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
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      integration.status === 'connected'
                        ? 'bg-green-100 text-green-700'
                        : integration.status === 'available'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
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
                  <Button variant="secondary" size="sm" className="flex-1">
                    Configure
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600">
                    Disconnect
                  </Button>
                </div>
              ) : integration.status === 'available' ? (
                <Button size="sm" className="w-full">
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
          <CardTitle>API Access</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">
            Use our REST API to integrate ORAH with your custom applications and workflows.
          </p>
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-2">API Endpoint</p>
            <code className="text-sm font-mono text-slate-700">
              https://api.orah.ai/v1
            </code>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" size="sm">
              View Documentation
            </Button>
            <Button variant="ghost" size="sm">
              Generate API Key
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
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-700">Lead Created</p>
                <p className="text-xs text-slate-500">Triggered when a new lead is added</p>
              </div>
              <Button variant="secondary" size="sm">Configure</Button>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-700">Call Completed</p>
                <p className="text-xs text-slate-500">Triggered when a call ends</p>
              </div>
              <Button variant="secondary" size="sm">Configure</Button>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-700">Lead Status Changed</p>
                <p className="text-xs text-slate-500">Triggered when lead status updates</p>
              </div>
              <Button variant="secondary" size="sm">Configure</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
