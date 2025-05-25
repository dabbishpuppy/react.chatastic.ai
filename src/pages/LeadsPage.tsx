
import React, { useState, useEffect } from "react";
import AgentPageLayout from "./AgentPageLayout";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Filter, Download, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  submitted_at: string;
}

const LeadsPage: React.FC = () => {
  const { agentId } = useParams();
  const [dateFilter, setDateFilter] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeads = async () => {
    if (!agentId) return;

    try {
      let query = supabase
        .from('leads')
        .select('*')
        .eq('agent_id', agentId)
        .order('submitted_at', { ascending: false });

      // Apply date filter if exists
      if (dateFilter) {
        const [startDate, endDate] = dateFilter.split(' ~ ');
        if (startDate && endDate) {
          query = query
            .gte('submitted_at', new Date(startDate).toISOString())
            .lte('submitted_at', new Date(endDate + ' 23:59:59').toISOString());
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching leads:', error);
        toast({
          title: "Error loading leads",
          description: "Failed to load leads data.",
          variant: "destructive"
        });
        return;
      }

      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Error loading leads",
        description: "Failed to load leads data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (leads.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no leads to export.",
        variant: "destructive"
      });
      return;
    }

    // Create CSV content
    const headers = ['Name', 'Email', 'Phone', 'Submitted At'];
    const csvContent = [
      headers.join(','),
      ...leads.map(lead => [
        lead.name || '',
        lead.email || '',
        lead.phone || '',
        new Date(lead.submitted_at).toLocaleString()
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${agentId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Your leads have been exported to CSV.",
    });
  };

  const handleClearDateFilter = () => {
    setDateFilter("");
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!agentId) return;

    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          console.log('New lead received:', payload);
          setLeads(prev => [payload.new as Lead, ...prev]);
          toast({
            title: "New lead received!",
            description: "A new lead has been submitted.",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  // Initial fetch
  useEffect(() => {
    fetchLeads();
  }, [agentId, dateFilter]);

  if (isLoading) {
    return (
      <AgentPageLayout 
        defaultActiveTab="activity" 
        defaultPageTitle="Leads"
        showPageTitle={false}
      >
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      </AgentPageLayout>
    );
  }

  return (
    <AgentPageLayout 
      defaultActiveTab="activity" 
      defaultPageTitle="Leads"
      showPageTitle={false}
    >
      <div className="p-8 bg-[#f5f5f5] overflow-hidden min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Leads ({leads.length})</h1>
          <div className="flex gap-2">
            <Button variant="outline" className="flex gap-1" onClick={fetchLeads}>
              <RefreshCcw size={18} />
              Refresh
            </Button>
            <Button variant="outline" className="flex gap-1">
              <Filter size={18} />
              Filter
            </Button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-6">
          {/* Filters section */}
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-2">Filters</h2>
            <div className="flex items-center gap-4">
              <div className="relative w-80">
                <Input 
                  value={dateFilter} 
                  onChange={(e) => setDateFilter(e.target.value)}
                  placeholder="YYYY-MM-DD ~ YYYY-MM-DD"
                  className="pr-10"
                />
                {dateFilter && (
                  <button 
                    onClick={handleClearDateFilter}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <Button variant="default" className="ml-auto bg-black hover:bg-gray-800" onClick={handleExport}>
                Export <Download size={18} className="ml-1" />
              </Button>
            </div>
          </div>
          
          {/* Table */}
          {leads.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No leads found.</p>
              <p className="text-sm mt-1">Leads will appear here when visitors submit the lead form in your chat widget.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-white">
                  <TableHead className="font-medium">Name</TableHead>
                  <TableHead className="font-medium">Email</TableHead>
                  <TableHead className="font-medium">Phone</TableHead>
                  <TableHead className="font-medium">Submitted at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>{lead.name || '-'}</TableCell>
                    <TableCell>{lead.email || '-'}</TableCell>
                    <TableCell>{lead.phone || '-'}</TableCell>
                    <TableCell>{formatDateTime(lead.submitted_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </AgentPageLayout>
  );
};

export default LeadsPage;
