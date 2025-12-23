import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { ArrowLeft, Phone, Mail, MapPin, Calendar, Clock, Save, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../lib/database.types';
import { getTimeCategory } from '../lib/timeClassification';
import { formatDate } from '../lib/utils';

type Lead = Database['public']['Tables']['leads']['Row'];
type Call = Database['public']['Tables']['calls']['Row'];

export function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    budget: '',
    unit_preference: '',
    location_preference: '',
    notes: '',
    status: 'new',
  });

  useEffect(() => {
    const fetchLead = async () => {
      if (!id || !profile?.company_id) return;

      try {
        setLoading(true);

        const [leadResult, callsResult] = await Promise.all([
          supabase
            .from('leads')
            .select('*')
            .eq('id', id)
            .eq('company_id', profile.company_id)
            .maybeSingle(),
          supabase
            .from('calls')
            .select('*')
            .eq('lead_id', id)
            .eq('company_id', profile.company_id)
            .order('created_at', { ascending: false }),
        ]);

        if (leadResult.error) throw leadResult.error;
        if (!leadResult.data) {
          navigate('/leads');
          return;
        }

        setLead(leadResult.data);
        setCalls(callsResult.data || []);
        setFormData({
          name: leadResult.data.name,
          mobile: leadResult.data.mobile,
          email: leadResult.data.email || '',
          budget: leadResult.data.budget || '',
          unit_preference: leadResult.data.unit_preference || '',
          location_preference: leadResult.data.location_preference || '',
          notes: leadResult.data.notes || '',
          status: leadResult.data.status,
        });
      } catch (error) {
        console.error('Error fetching lead:', error);
        navigate('/leads');
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [id, profile?.company_id, navigate]);

  const handleSave = async () => {
    if (!id || !profile?.company_id) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('leads')
        .update({
          name: formData.name,
          mobile: formData.mobile,
          email: formData.email || null,
          budget: formData.budget || null,
          unit_preference: formData.unit_preference || null,
          location_preference: formData.location_preference || null,
          notes: formData.notes || null,
          status: formData.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('company_id', profile.company_id);

      if (error) throw error;

      setLead(prev => prev ? { ...prev, ...formData } : null);
      setEditing(false);
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Failed to update lead');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !profile?.company_id) return;
    if (!confirm('Are you sure you want to delete this lead?')) return;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id)
        .eq('company_id', profile.company_id);

      if (error) throw error;
      navigate('/leads');
    } catch (error) {
      console.error('Error deleting lead:', error);
      alert('Failed to delete lead');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Loading lead details...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Lead not found</p>
      </div>
    );
  }

  const timeCategory = getTimeCategory(lead.created_at);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/leads')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Leads
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Lead Information</CardTitle>
                <div className="flex gap-2">
                  {editing ? (
                    <>
                      <Button variant="secondary" onClick={() => setEditing(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="secondary" onClick={() => setEditing(true)}>
                        Edit
                      </Button>
                      <Button variant="danger" onClick={handleDelete}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="mobile">Mobile</Label>
                    <Input
                      id="mobile"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="unqualified">Unqualified</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="budget">Budget</Label>
                    <Input
                      id="budget"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit_preference">Unit Preference</Label>
                    <Input
                      id="unit_preference"
                      value={formData.unit_preference}
                      onChange={(e) => setFormData({ ...formData, unit_preference: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="location_preference">Location</Label>
                    <Input
                      id="location_preference"
                      value={formData.location_preference}
                      onChange={(e) => setFormData({ ...formData, location_preference: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-semibold">
                      {lead.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{lead.name}</h3>
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                        lead.status === 'new' ? 'bg-blue-100 text-blue-700' :
                        lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-700' :
                        lead.status === 'qualified' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {lead.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 text-slate-600">
                      <Phone className="w-4 h-4" />
                      <span>{lead.mobile}</span>
                    </div>
                    {lead.email && (
                      <div className="flex items-center gap-3 text-slate-600">
                        <Mail className="w-4 h-4" />
                        <span>{lead.email}</span>
                      </div>
                    )}
                    {lead.location_preference && (
                      <div className="flex items-center gap-3 text-slate-600">
                        <MapPin className="w-4 h-4" />
                        <span>{lead.location_preference}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-slate-600">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(lead.created_at)}</span>
                    </div>
                  </div>

                  {(lead.budget || lead.unit_preference) && (
                    <div className="pt-4 border-t border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Preferences</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {lead.budget && (
                          <div>
                            <p className="text-xs text-slate-500">Budget</p>
                            <p className="text-sm font-medium">{lead.budget}</p>
                          </div>
                        )}
                        {lead.unit_preference && (
                          <div>
                            <p className="text-xs text-slate-500">Unit Type</p>
                            <p className="text-sm font-medium">{lead.unit_preference}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {lead.notes && (
                    <div className="pt-4 border-t border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Notes</h4>
                      <p className="text-sm text-slate-600">{lead.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Call History</CardTitle>
            </CardHeader>
            <CardContent>
              {calls.length === 0 ? (
                <p className="text-sm text-slate-500">No calls recorded for this lead.</p>
              ) : (
                <div className="space-y-3">
                  {calls.map((call) => (
                    <div key={call.id} className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          call.status === 'completed' ? 'bg-green-100 text-green-700' :
                          call.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {call.status}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDate(call.created_at)}
                        </span>
                      </div>
                      {call.summary && (
                        <p className="text-sm text-slate-600">{call.summary}</p>
                      )}
                      {call.duration && (
                        <p className="text-xs text-slate-500 mt-2">
                          Duration: {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-600">Time Category</span>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    timeCategory === 'Working Hours' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {timeCategory}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-600">Total Calls</span>
                  <span className="text-lg font-bold text-slate-900">{calls.length}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-600">Successful Calls</span>
                  <span className="text-lg font-bold text-green-600">
                    {calls.filter(c => c.success_evaluation).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
