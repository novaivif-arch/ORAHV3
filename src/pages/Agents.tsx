import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Bot, Plus, X, Power, PowerOff, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../lib/database.types';

type Agent = Database['public']['Tables']['agents']['Row'];

export function Agents() {
  const { profile, loading: authLoading } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    voice_id: '',
    system_prompt: '',
  });

  const fetchAgents = async () => {
    if (authLoading || !profile?.company_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [profile?.company_id, authLoading]);

  const handleOpenModal = (agent?: Agent) => {
    if (agent) {
      setEditingAgent(agent);
      setFormData({
        name: agent.name,
        description: agent.description || '',
        voice_id: agent.voice_id || '',
        system_prompt: agent.system_prompt || '',
      });
    } else {
      setEditingAgent(null);
      setFormData({
        name: '',
        description: '',
        voice_id: '',
        system_prompt: '',
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) return;

    try {
      setSaving(true);

      if (editingAgent) {
        const { error } = await supabase
          .from('agents')
          .update({
            name: formData.name,
            description: formData.description || null,
            voice_id: formData.voice_id || null,
            system_prompt: formData.system_prompt || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingAgent.id)
          .eq('company_id', profile.company_id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('agents')
          .insert({
            company_id: profile.company_id,
            name: formData.name,
            description: formData.description || null,
            voice_id: formData.voice_id || null,
            system_prompt: formData.system_prompt || null,
          });

        if (error) throw error;
      }

      setShowModal(false);
      await fetchAgents();
    } catch (error) {
      console.error('Error saving agent:', error);
      alert('Failed to save agent');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (agent: Agent) => {
    if (!profile?.company_id) return;

    try {
      const { error } = await supabase
        .from('agents')
        .update({ is_active: !agent.is_active })
        .eq('id', agent.id)
        .eq('company_id', profile.company_id);

      if (error) throw error;
      await fetchAgents();
    } catch (error) {
      console.error('Error toggling agent:', error);
    }
  };

  const handleDelete = async (agent: Agent) => {
    if (!profile?.company_id) return;
    if (!confirm(`Are you sure you want to delete "${agent.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', agent.id)
        .eq('company_id', profile.company_id);

      if (error) throw error;
      await fetchAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Loading agents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">AI Agents</h2>
          <p className="text-slate-500">Configure your AI calling agents</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Agent
        </Button>
      </div>

      {agents.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Bot className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Agents Yet</h3>
            <p className="text-sm text-slate-500 mb-4">
              Create your first AI agent to start making automated calls to your leads.
            </p>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <Card key={agent.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${agent.is_active ? 'bg-green-100' : 'bg-slate-100'}`}>
                      <Bot className={`w-5 h-5 ${agent.is_active ? 'text-green-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        agent.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {agent.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {agent.description && (
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{agent.description}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(agent)}
                    className="flex-1"
                  >
                    {agent.is_active ? (
                      <>
                        <PowerOff className="w-4 h-4 mr-1" />
                        Disable
                      </>
                    ) : (
                      <>
                        <Power className="w-4 h-4 mr-1" />
                        Enable
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenModal(agent)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(agent)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingAgent ? 'Edit Agent' : 'Create Agent'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <Label htmlFor="name">Agent Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Sales Agent"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the agent's purpose"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <Label htmlFor="voice_id">Voice ID</Label>
                <Input
                  id="voice_id"
                  value={formData.voice_id}
                  onChange={(e) => setFormData({ ...formData, voice_id: e.target.value })}
                  placeholder="Enter voice ID from your TTS provider"
                />
              </div>

              <div>
                <Label htmlFor="system_prompt">System Prompt</Label>
                <textarea
                  id="system_prompt"
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  placeholder="Enter the system prompt for this agent..."
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? 'Saving...' : editingAgent ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
