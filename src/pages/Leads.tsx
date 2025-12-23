import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Plus, CheckCircle2, XCircle, X, Search, Filter, Users, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../lib/database.types';
import { getTimeCategory } from '../lib/timeClassification';

type Lead = Database['public']['Tables']['leads']['Row'];

interface EnrichedLead extends Lead {
  timeCategory: 'Working Hours' | 'Non-Working Hours';
  successEvaluation: boolean;
}

export function Leads() {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<EnrichedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState({
    status: 'all',
    timeCategory: 'all',
    success: 'all',
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    budget: '',
    unit_preference: '',
    location_preference: '',
    notes: '',
  });

  const fetchLeads = async () => {
    if (authLoading) return;

    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;

      const { data: callsData } = await supabase
        .from('calls')
        .select('lead_id, success_evaluation')
        .eq('company_id', profile.company_id);

      const callsMap = new Map(
        callsData?.map(call => [call.lead_id, call]) || []
      );

      const enrichedLeads: EnrichedLead[] = (leadsData || []).map(lead => {
        const call = callsMap.get(lead.id);
        return {
          ...lead,
          timeCategory: getTimeCategory(lead.created_at),
          successEvaluation: call?.success_evaluation || false,
        };
      });

      setLeads(enrichedLeads);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load leads';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [profile?.company_id, authLoading]);

  useEffect(() => {
    if (!profile?.company_id) return;

    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `company_id=eq.${profile.company_id}`,
        },
        () => {
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.company_id]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile?.company_id) return;

    try {
      setSaving(true);

      const { error: insertError } = await supabase
        .from('leads')
        .insert({
          company_id: profile.company_id,
          name: formData.name,
          mobile: formData.mobile,
          email: formData.email || null,
          budget: formData.budget || null,
          unit_preference: formData.unit_preference || null,
          location_preference: formData.location_preference || null,
          notes: formData.notes || null,
          status: 'new',
        });

      if (insertError) throw insertError;

      setShowAddModal(false);
      setFormData({
        name: '',
        mobile: '',
        email: '',
        budget: '',
        unit_preference: '',
        location_preference: '',
        notes: '',
      });

      await fetchLeads();
    } catch (err) {
      console.error('Error adding lead:', err);
      alert(err instanceof Error ? err.message : 'Failed to add lead');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'contacted': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'qualified': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'unqualified': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredLeads = leads.filter(lead => {
    if (filter.status !== 'all' && lead.status !== filter.status) return false;
    if (filter.timeCategory !== 'all' && lead.timeCategory !== filter.timeCategory) return false;
    if (filter.success === 'true' && !lead.successEvaluation) return false;
    if (filter.success === 'false' && lead.successEvaluation) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        lead.name?.toLowerCase().includes(query) ||
        lead.mobile?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const uniqueStatuses = ['new', 'contacted', 'qualified', 'unqualified'];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Leads</h2>
          <p className="text-slate-500 mt-1">Manage your real estate leads</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Lead
        </Button>
      </div>

      {loading ? (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500">Loading leads...</p>
          </div>
        </div>
      ) : error ? (
        <Card className="border-0 shadow-lg">
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-rose-600" />
            </div>
            <p className="text-rose-600 font-semibold mb-2">Error loading leads</p>
            <p className="text-sm text-slate-500">{error}</p>
            <Button onClick={fetchLeads} className="mt-4">
              Try Again
            </Button>
          </div>
        </Card>
      ) : leads.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No leads yet</h3>
            <p className="text-slate-500 mb-6">Get started by adding your first lead to the system.</p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Lead
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <CardTitle className="text-lg font-semibold">
                All Leads
                <span className="ml-2 px-2.5 py-0.5 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                  {filteredLeads.length}
                </span>
              </CardTitle>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search leads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1">
                  <Filter className="w-4 h-4 text-slate-400 ml-2" />
                  <select
                    value={filter.status}
                    onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                    className="px-2 py-1.5 text-sm bg-transparent border-none focus:outline-none"
                  >
                    <option value="all">All Status</option>
                    {uniqueStatuses.map(status => (
                      <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <select
                  value={filter.timeCategory}
                  onChange={(e) => setFilter({ ...filter, timeCategory: e.target.value })}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Time</option>
                  <option value="Working Hours">Working Hours</option>
                  <option value="Non-Working Hours">Non-Working Hours</option>
                </select>
                <select
                  value={filter.success}
                  onChange={(e) => setFilter({ ...filter, success: e.target.value })}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Results</option>
                  <option value="true">Successful</option>
                  <option value="false">Failed/Nurture</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lead</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Contact</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Time</th>
                    <th className="text-center py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Result</th>
                    <th className="text-right py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors group"
                      onClick={() => navigate(`/leads/${lead.id}`)}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md">
                            {lead.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{lead.name}</p>
                            <p className="text-sm text-slate-500">
                              {new Date(lead.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 hidden md:table-cell">
                        <p className="text-sm font-medium text-slate-900">{lead.mobile}</p>
                        <p className="text-sm text-slate-500">{lead.email || '-'}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(lead.status)}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 hidden lg:table-cell">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                          lead.timeCategory === 'Working Hours'
                            ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                            : 'bg-slate-50 text-slate-600 border border-slate-200'
                        }`}>
                          {lead.timeCategory === 'Working Hours' ? 'Working' : 'Non-Working'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {lead.successEvaluation ? (
                          <div className="inline-flex items-center justify-center w-8 h-8 bg-emerald-100 rounded-full">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center w-8 h-8 bg-rose-100 rounded-full">
                            <XCircle className="w-5 h-5 text-rose-600" />
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all inline-block" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLeads.length === 0 && (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500">No leads match the selected filters</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">Add New Lead</h3>
                <p className="text-blue-100 text-sm mt-0.5">Fill in the lead details below</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <form onSubmit={handleAddLead} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-88px)]">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="name" className="text-slate-700 font-medium">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Enter full name"
                    className="mt-1.5 h-11 bg-slate-50 border-slate-200"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="mobile" className="text-slate-700 font-medium">Mobile *</Label>
                  <Input
                    id="mobile"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    required
                    placeholder="+91 98765 43210"
                    className="mt-1.5 h-11 bg-slate-50 border-slate-200"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className="mt-1.5 h-11 bg-slate-50 border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="budget" className="text-slate-700 font-medium">Budget</Label>
                  <Input
                    id="budget"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="e.g., 70L - 1Cr"
                    className="mt-1.5 h-11 bg-slate-50 border-slate-200"
                  />
                </div>

                <div>
                  <Label htmlFor="unit_preference" className="text-slate-700 font-medium">Unit Preference</Label>
                  <Input
                    id="unit_preference"
                    value={formData.unit_preference}
                    onChange={(e) => setFormData({ ...formData, unit_preference: e.target.value })}
                    placeholder="e.g., 3 BHK"
                    className="mt-1.5 h-11 bg-slate-50 border-slate-200"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="location_preference" className="text-slate-700 font-medium">Location Preference</Label>
                <Input
                  id="location_preference"
                  value={formData.location_preference}
                  onChange={(e) => setFormData({ ...formData, location_preference: e.target.value })}
                  placeholder="e.g., Whitefield, Bangalore"
                  className="mt-1.5 h-11 bg-slate-50 border-slate-200"
                />
              </div>

              <div>
                <Label htmlFor="notes" className="text-slate-700 font-medium">Notes</Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about the lead..."
                  rows={3}
                  className="mt-1.5 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 h-11"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Adding...
                    </span>
                  ) : 'Add Lead'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
