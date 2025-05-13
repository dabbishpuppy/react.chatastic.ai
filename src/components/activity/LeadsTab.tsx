
import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Filter, Download, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

// Mock data for leads
const leads = [
  { id: "1", name: "John Doe", email: "john@example.com", date: "2 days ago", status: "New" },
  { id: "2", name: "Jane Smith", email: "jane@example.com", date: "3 days ago", status: "Contacted" },
  { id: "3", name: "Alex Johnson", email: "alex@example.com", date: "5 days ago", status: "Qualified" },
];

const LeadsTab: React.FC = () => {
  const handleExport = () => {
    toast({
      title: "Export initiated",
      description: "Your leads are being exported",
    });
  };

  const handleDelete = (id: string) => {
    toast({
      title: "Lead deleted",
      description: `Lead ${id} has been deleted`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Leads</h2>
        <div className="flex gap-2">
          <Button variant="outline" className="flex gap-1">
            <RefreshCcw size={18} />
            Refresh
          </Button>
          <Button variant="outline" className="flex gap-1">
            <Filter size={18} />
            Filter
          </Button>
          <Button onClick={handleExport} className="bg-black hover:bg-gray-800 flex gap-1">
            Export
            <Download size={18} />
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id} className="cursor-pointer hover:bg-gray-50">
                <TableCell className="font-medium">{lead.name}</TableCell>
                <TableCell>{lead.email}</TableCell>
                <TableCell>{lead.date}</TableCell>
                <TableCell>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {lead.status}
                  </span>
                </TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(lead.id);
                    }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={18} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default LeadsTab;
