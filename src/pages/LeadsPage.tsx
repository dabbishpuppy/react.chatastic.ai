
import React, { useState } from "react";
import AgentPageLayout from "./AgentPageLayout";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Filter, Download, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

// Mock data for leads
const mockLeads = [
  { id: "1", name: "Nohman Janjua", email: "nohmanjanjua@gmail.com", phone: "45494649", submittedAt: "2025-5-20 9:31:11" },
  { id: "2", name: "Jane Smith", email: "jane@example.com", phone: "55512345", submittedAt: "2025-5-19 14:22:05" },
  { id: "3", name: "Alex Johnson", email: "alex@example.com", phone: "55534567", submittedAt: "2025-5-18 10:45:30" },
];

const LeadsPage: React.FC = () => {
  const [dateFilter, setDateFilter] = useState("2025-04-20 ~ 2025-05-20");
  const [leads, setLeads] = useState(mockLeads);

  const handleExport = () => {
    toast({
      title: "Export initiated",
      description: "Your leads are being exported",
    });
  };

  const handleClearDateFilter = () => {
    setDateFilter("");
    // In a real app, you would refetch leads without the date filter
  };

  return (
    <AgentPageLayout 
      defaultActiveTab="activity" 
      defaultPageTitle="Leads"
      showPageTitle={false}
    >
      <div className="p-8 bg-[#f5f5f5] overflow-hidden min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Leads</h1>
          <div className="flex gap-2">
            <Button variant="outline" className="flex gap-1">
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
                  <TableCell>{lead.name}</TableCell>
                  <TableCell>{lead.email}</TableCell>
                  <TableCell>{lead.phone}</TableCell>
                  <TableCell>{lead.submittedAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AgentPageLayout>
  );
};

export default LeadsPage;
